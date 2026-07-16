"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CfbdPlay {
  id: string;
  driveId: string;
  driveNumber: number;
  playNumber: number;
  offense: string;
  offenseScore: number;
  defense: string;
  defenseScore: number;
  period: number;
  clock: { minutes: number; seconds: number };
  yardline: number;
  yardsToGoal: number;
  down: number | null;
  distance: number | null;
  yardsGained: number;
  scoring: boolean;
  playType: string;
  playText: string;
}

interface PlayerInfo {
  name: string;
  position: string;
  headshotUrl: string | null;
}

interface PlayViewerProps {
  plays: CfbdPlay[];
  opponent: string;
  playerMap: Record<string, PlayerInfo>;
}

// Yards-to-goal → SVG Y position on the field (not including end zones)
// Field SVG: total height ~520px. End zones are 40px each. Field is 440px.
// Michigan always attacks UPWARD (toward opponent end zone at top).
// Opponent always attacks DOWNWARD (toward Michigan end zone at bottom).
const FIELD_SVG_WIDTH = 300;
const FIELD_SVG_HEIGHT = 520;
const EZ_HEIGHT = 40; // end zone height px
const FIELD_PLAY_HEIGHT = FIELD_SVG_HEIGHT - 2 * EZ_HEIGHT; // 440px

// Absolute position = yards from Michigan's end zone (0 = Michigan goal, 100 = opponent goal)
function absolutePosition(yardsToGoal: number, isMichiganOffense: boolean): number {
  return isMichiganOffense ? 100 - yardsToGoal : yardsToGoal;
}

// Absolute field position → SVG Y (Michigan goal = bottom, opponent goal = top)
function absoluteToSvgY(absolute: number): number {
  const clamped = Math.max(0, Math.min(100, absolute));
  return EZ_HEIGHT + ((100 - clamped) / 100) * FIELD_PLAY_HEIGHT;
}

function yardsToY(yardsToGoal: number, isMichiganOffense: boolean): number {
  return absoluteToSvgY(absolutePosition(yardsToGoal, isMichiganOffense));
}

function playTypeBadgeColor(playType: string): string {
  const t = playType.toLowerCase();
  if (t.includes("rush")) return "bg-green-900/60 text-green-300";
  if (t.includes("pass") || t.includes("sack")) return "bg-blue-900/60 text-blue-300";
  if (t.includes("punt")) return "bg-purple-900/60 text-purple-300";
  if (t.includes("field goal") || t.includes("fg")) return "bg-yellow-900/60 text-yellow-300";
  if (t.includes("kickoff")) return "bg-gray-700 text-gray-300";
  if (t.includes("touchdown")) return "bg-red-900/60 text-red-300";
  if (t.includes("penalty")) return "bg-orange-900/60 text-orange-300";
  return "bg-gray-700 text-gray-300";
}

function shortPlayType(playType: string): string {
  const t = playType.toLowerCase();
  if (t.includes("rush")) return "Rush";
  if (t.includes("pass completion")) return "Pass ✓";
  if (t.includes("pass incompletion")) return "Incomp";
  if (t.includes("pass")) return "Pass";
  if (t.includes("sack")) return "Sack";
  if (t.includes("punt")) return "Punt";
  if (t.includes("field goal")) return "FG";
  if (t.includes("kickoff")) return "Kickoff";
  if (t.includes("touchdown")) return "TD";
  if (t.includes("penalty")) return "Penalty";
  if (t.includes("timeout")) return "Timeout";
  if (t.includes("end of")) return "EOQ";
  return playType.slice(0, 8);
}

function formatClock(clock: { minutes: number; seconds: number }): string {
  return `${clock.minutes}:${String(clock.seconds).padStart(2, "0")}`;
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function isDeadBallPlayType(p: CfbdPlay): boolean {
  return ["timeout", "end of", "end period", "two-minute", "coin toss"].some(
    t => p.playType.toLowerCase().includes(t)
  );
}

function isPenaltyPlayType(p: CfbdPlay): boolean {
  return p.playType.toLowerCase().includes("penalty");
}

// Some plays combine a real result with a penalty enforced on top of it — e.g. a run that gains
// 2 yards followed by a face-mask call enforced an extra 15 yards beyond the end of the run.
// CFBD keeps the underlying playType (e.g. "Rush") for these rows instead of "Penalty", so
// isPenaltyPlayType alone misses them, but the row's own yardsGained only covers the run, not
// the additional penalty yardage. Detect these via playText instead. Declined/offsetting
// penalties don't move the ball, so they're excluded.
function hasEnforcedPenaltyText(p: CfbdPlay): boolean {
  const t = p.playText.toLowerCase();
  return t.includes("penalty") && !t.includes("declined") && !t.includes("offsetting");
}

// True when a row's own yardsGained can't be trusted as the full net yardage for the down —
// either a standalone "NO PLAY" penalty row, or a real play with a penalty tacked on afterward.
function hasUnreliableYardage(p: CfbdPlay): boolean {
  return isPenaltyPlayType(p) || hasEnforcedPenaltyText(p);
}

function isPossessionChangePlayType(p: CfbdPlay): boolean {
  // "Fumble Recovery" covers plays like a muffed kickoff/punt return recovered by the
  // kicking team — CFBD collapses the whole kick+return+fumble sequence into one row whose
  // own yardsGained/yardsToGoal reflect the return, not the final recovery spot. Treat it
  // like other possession-change types so the next play's own LOS is trusted instead of
  // chained off this row's numbers.
  return ["kickoff", "punt", "interception return", "fumble return", "fumble recovery"].some(
    t => p.playType.toLowerCase().includes(t)
  );
}

// "Field Goal Good"/"Field Goal Missed" rows carry the kick distance in yardsGained (e.g. 45),
// not a real forward-progress yardage — chaining a later row's LOS off that number produces
// nonsense (a missed 45-yard attempt would "subtract" 45 yards from the kick spot). A field goal
// attempt always ends the drive in practice, so the only row that can share its driveNumber is a
// dead-ball marker (timeout/end of period) right before the drive number increments — treat the
// attempt as a trust boundary the same way a kickoff/punt/penalty already is.
function isKickAttemptPlayType(p: CfbdPlay): boolean {
  return p.playType.toLowerCase().includes("field goal");
}

// Timeout rows report whichever team called the timeout as "offense" — even when that team is
// actually on defense for the drive (e.g. the defense burning a timeout before a 3rd down).
// Every other play type uses "offense" to mean the team snapping the ball, so trusting it here
// flips the field orientation (and HUD score) for that row. Since a timeout can't change
// possession, inherit the true offense from the nearest live snap in the same drive instead.
function resolveOffenseTeam(plays: CfbdPlay[], idx: number): string {
  const play = plays[idx];
  if (play.playType.toLowerCase() !== "timeout") return play.offense;
  for (let i = idx - 1; i >= 0 && plays[i].driveNumber === play.driveNumber; i--) {
    if (plays[i].playType.toLowerCase() !== "timeout") return plays[i].offense;
  }
  for (let i = idx + 1; i < plays.length && plays[i].driveNumber === play.driveNumber; i++) {
    if (plays[i].playType.toLowerCase() !== "timeout") return plays[i].offense;
  }
  return play.offense;
}

// CFBD occasionally reports a stale/wrong yardsToGoal on an ordinary scrimmage play mid-drive
// (seen during no-huddle sequences where snaps happen seconds apart) — the row's own yardsGained
// stays accurate even when its pre-play LOS doesn't. Rather than trust each row's yardsToGoal,
// chain forward from the last trustworthy anchor (a kickoff/punt/turnover landing spot, a spot
// just after a penalty, or the start of a new drive) using the accumulated yardsGained instead.
function resolvedPreLosYtg(plays: CfbdPlay[], idx: number): number {
  const play = plays[idx];
  const prev = idx > 0 ? plays[idx - 1] : null;
  if (!prev || prev.driveNumber !== play.driveNumber) return play.yardsToGoal;
  if (isPossessionChangePlayType(prev) || hasUnreliableYardage(prev) || isKickAttemptPlayType(prev)) return play.yardsToGoal;
  if (isDeadBallPlayType(prev)) return resolvedPreLosYtg(plays, idx - 1);
  return resolvedPreLosYtg(plays, idx - 1) - prev.yardsGained;
}

function playTextIsFirstDownOrScore(p: CfbdPlay): boolean {
  const t = p.playText.toUpperCase();
  return t.includes("1ST DOWN") || t.includes("TOUCHDOWN");
}

// Resolves the true down & distance for any row. CFBD's own down/distance fields go stale in
// the same spots its yardsToGoal does — most visibly, the live snap right after a timeout can
// keep reporting the pre-timeout down/distance instead of what actually resulted from the last
// live play. Rather than trust any row's own fields mid-drive, chain forward from the last
// trustworthy anchor (same anchors as resolvedPreLosYtg: start of drive, right after a
// kickoff/punt/turnover, or right after a penalty is enforced) by simulating each play's result
// off its own yardsGained — a timeout/end-of-period doesn't change the down, so it just carries
// the previous state through unchanged.
function resolvedDownDistance(plays: CfbdPlay[], idx: number): { down: number | null; distance: number | null } {
  const play = plays[idx];

  // NO-PLAY penalty rows show the resulting down/distance for the very next row — trusted
  // directly rather than recursed into, since a second NO-PLAY penalty on the next down is a
  // separate, independent event with its own result (recursing would pull in that second
  // penalty's effect too instead of just this one's).
  if (isPenaltyPlayType(play)) {
    for (let i = idx + 1; i < plays.length && plays[i].driveNumber === play.driveNumber; i++) {
      if (!isDeadBallPlayType(plays[i])) return { down: plays[i].down, distance: plays[i].distance };
    }
    return { down: play.down, distance: play.distance };
  }

  const prev = idx > 0 ? plays[idx - 1] : null;
  if (!prev || prev.driveNumber !== play.driveNumber) return { down: play.down, distance: play.distance };
  if (isPossessionChangePlayType(prev) || hasUnreliableYardage(prev) || isKickAttemptPlayType(prev)) return { down: play.down, distance: play.distance };

  const prevResolved = resolvedDownDistance(plays, idx - 1);
  if (isDeadBallPlayType(prev)) return prevResolved; // no play happened; carry through unchanged

  const prevDistance = prevResolved.distance ?? 10;
  const converted = prev.yardsGained >= prevDistance || playTextIsFirstDownOrScore(prev);
  if (converted) {
    const ytg = resolvedPreLosYtg(plays, idx);
    return { down: 1, distance: Math.min(10, ytg) };
  }
  return { down: (prevResolved.down ?? 1) + 1, distance: prevDistance - prev.yardsGained };
}

// Penalties are "NO PLAY" rows — CFBD's yardsGained on them is the penalty distance, not a
// signed gain/loss. Derive the real (signed) yardage from the LOS shift to the very next row
// (only dead-ball placeholders are skipped — a second NO-PLAY penalty on the very next down is
// still this penalty's own direct result, not something to skip past), as long as possession
// didn't also change on the way there.
function penaltyYards(plays: CfbdPlay[], idx: number): number | null {
  const play = plays[idx];
  for (let i = idx + 1; i < plays.length; i++) {
    const next = plays[i];
    if (isDeadBallPlayType(next)) continue;
    return next.offense === play.offense ? resolvedPreLosYtg(plays, idx) - next.yardsToGoal : null;
  }
  return null;
}

// Yardage to display in the play log — null means "no meaningful yardage" (renders as "—").
function displayYards(plays: CfbdPlay[], idx: number): number | null {
  const play = plays[idx];
  if (isDeadBallPlayType(play)) return null;
  if (hasUnreliableYardage(play)) return penaltyYards(plays, idx);
  return play.yardsGained;
}

// CFBD's detailed playText format embeds a formation/tempo call (e.g. "No Huddle-Shotgun")
// right after the leading clock timestamp — but which weeks get this tag at all (and how often)
// depends entirely on which text-generation source CFBD used for that game, not on how the
// offense actually operated (see e.g. Michigan vs Texas, where it's tagged on almost every
// snap). It's noise rather than a meaningful signal here, so strip it from the display.
function displayPlayText(text: string): string {
  return text.replace(/^(\(\d{1,2}:\d{2}\)\s*)(No Huddle-Shotgun|No Huddle|Shotgun)\s+/, "$1");
}

function extractMichiganPlayer(
  playText: string,
  playerMap: Record<string, PlayerInfo>
): PlayerInfo | null {
  // Try to find a last name token that matches a player in DB
  const words = playText.replace(/[^a-zA-Z '-]/g, " ").split(/\s+/);
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z]/g, "");
    if (lower.length > 2 && playerMap[lower]) {
      return playerMap[lower];
    }
  }
  return null;
}

// SVG Football Field — all positions are pre-computed SVG Y values by the caller
function FootballField({
  play,
  isMichiganOffense,
  ballSvgY,
  arrowFromSvgY,
  arrowToSvgY,
  gainColor,
  opponent,
  hudDown,
  hudDistance,
}: {
  play: CfbdPlay;
  isMichiganOffense: boolean;
  hudDown: number | null;
  hudDistance: number | null;
  ballSvgY: number;
  arrowFromSvgY: number | null;
  arrowToSvgY: number | null;
  gainColor: string;
  opponent: string;
}) {
  const arrowFromY = arrowFromSvgY;
  const arrowToY   = arrowToSvgY;
  const showArrow = arrowFromY !== null && arrowToY !== null && Math.abs(arrowFromY - arrowToY) > 2;

  // Yard line labels
  const yardLines = [10, 20, 30, 40, 50, 40, 30, 20, 10];
  // Each 10 yards = FIELD_PLAY_HEIGHT/10 px
  const ypx = FIELD_PLAY_HEIGHT / 10;

  // Scores are tagged to CFBD's own (raw, uncorrected) offense/defense fields — unlike field
  // position, they must NOT use the resolved isMichiganOffense prop. A "Timeout Michigan" row
  // reports offense: "Michigan" even when Texas is actually driving (the offense field on
  // timeout rows names whoever called it, not the true offense), so offenseScore/defenseScore
  // on that row are tied to that raw label, not the corrected one.
  const isMichiganOffenseRaw = play.offense === "Michigan";
  const michiganScore = isMichiganOffenseRaw ? play.offenseScore : play.defenseScore;
  const oppScore = isMichiganOffenseRaw ? play.defenseScore : play.offenseScore;

  return (
    <svg
      viewBox={`0 0 ${FIELD_SVG_WIDTH} ${FIELD_SVG_HEIGHT}`}
      className="w-full max-w-xs mx-auto lg:h-full lg:w-auto lg:max-h-full lg:max-w-full"
      style={{ display: "block" }}
    >
      {/* Background */}
      <rect width={FIELD_SVG_WIDTH} height={FIELD_SVG_HEIGHT} fill="#1a3a1a" />

      {/* Opponent end zone (top) */}
      <rect x={0} y={0} width={FIELD_SVG_WIDTH} height={EZ_HEIGHT} fill="#0f2a1a" />
      <text
        x={FIELD_SVG_WIDTH / 2}
        y={EZ_HEIGHT / 2 + 5}
        textAnchor="middle"
        fill="#9ca3af"
        fontSize={10}
        fontWeight="bold"
        letterSpacing={3}
      >
        {opponent.toUpperCase().slice(0, 12)}
      </text>

      {/* Michigan end zone (bottom) */}
      <rect x={0} y={FIELD_SVG_HEIGHT - EZ_HEIGHT} width={FIELD_SVG_WIDTH} height={EZ_HEIGHT} fill="#00274C" />
      <text
        x={FIELD_SVG_WIDTH / 2}
        y={FIELD_SVG_HEIGHT - EZ_HEIGHT / 2 + 5}
        textAnchor="middle"
        fill="#FFCB05"
        fontSize={10}
        fontWeight="bold"
        letterSpacing={3}
      >
        MICHIGAN
      </text>

      {/* Yard lines and labels */}
      {yardLines.map((label, i) => {
        const lineY = EZ_HEIGHT + (i + 1) * ypx;
        return (
          <g key={i}>
            <line
              x1={0}
              y1={lineY}
              x2={FIELD_SVG_WIDTH}
              y2={lineY}
              stroke="#ffffff"
              strokeOpacity={0.25}
              strokeWidth={i === 4 ? 2 : 1}
            />
            <text
              x={FIELD_SVG_WIDTH / 2}
              y={lineY - 3}
              textAnchor="middle"
              fill="#ffffff"
              fillOpacity={0.4}
              fontSize={9}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Hash marks every 5 yards */}
      {Array.from({ length: 20 }, (_, i) => {
        const lineY = EZ_HEIGHT + (i + 0.5) * (ypx / 2);
        return (
          <g key={i}>
            <line x1={FIELD_SVG_WIDTH * 0.3} y1={lineY} x2={FIELD_SVG_WIDTH * 0.35} y2={lineY} stroke="#fff" strokeOpacity={0.15} strokeWidth={0.5} />
            <line x1={FIELD_SVG_WIDTH * 0.65} y1={lineY} x2={FIELD_SVG_WIDTH * 0.7} y2={lineY} stroke="#fff" strokeOpacity={0.15} strokeWidth={0.5} />
          </g>
        );
      })}

      {/* Gain arrow */}
      {showArrow && (
        <>
          <line
            x1={FIELD_SVG_WIDTH / 2}
            y1={arrowFromY}
            x2={FIELD_SVG_WIDTH / 2}
            y2={arrowToY}
            stroke={gainColor}
            strokeWidth={3}
            strokeOpacity={0.85}
          />
          {/* arrowhead */}
          <polygon
            points={`${FIELD_SVG_WIDTH / 2 - 6},${arrowToY + (arrowToY < arrowFromY ? 8 : -8)} ${FIELD_SVG_WIDTH / 2 + 6},${arrowToY + (arrowToY < arrowFromY ? 8 : -8)} ${FIELD_SVG_WIDTH / 2},${arrowToY}`}
            fill={gainColor}
            fillOpacity={0.85}
          />
        </>
      )}

      {/* Ball marker */}
      <circle
        cx={FIELD_SVG_WIDTH / 2}
        cy={ballSvgY}
        r={9}
        fill="#FFCB05"
        stroke="#000"
        strokeWidth={1.5}
        style={{ transition: "cy 0.4s ease" }}
      />
      <text
        x={FIELD_SVG_WIDTH / 2}
        y={ballSvgY + 4}
        textAnchor="middle"
        fill="#00274C"
        fontSize={9}
        fontWeight="bold"
      >
        ◈
      </text>

      {/* HUD overlay */}
      <rect x={0} y={EZ_HEIGHT} width={FIELD_SVG_WIDTH} height={36} fill="#000" fillOpacity={0.55} />
      {/* Quarter & clock */}
      <text x={8} y={EZ_HEIGHT + 14} fill="#fff" fontSize={10} fontWeight="bold">
        Q{play.period}
      </text>
      <text x={8} y={EZ_HEIGHT + 28} fill="#9ca3af" fontSize={10}>
        {formatClock(play.clock)}
      </text>
      {/* Down & distance */}
      {hudDown != null && hudDown > 0 && (
        <text x={FIELD_SVG_WIDTH / 2} y={EZ_HEIGHT + 14} fill="#FFCB05" fontSize={10} fontWeight="bold" textAnchor="middle">
          {ordinal(hudDown)} &amp; {hudDistance ?? "Goal"}
        </text>
      )}
      {/* Score */}
      <text x={FIELD_SVG_WIDTH - 8} y={EZ_HEIGHT + 14} fill="#FFCB05" fontSize={10} fontWeight="bold" textAnchor="end">
        UM {michiganScore}
      </text>
      <text x={FIELD_SVG_WIDTH - 8} y={EZ_HEIGHT + 28} fill="#9ca3af" fontSize={10} textAnchor="end">
        {opponent.slice(0, 8)} {oppScore}
      </text>
    </svg>
  );
}

export default function PlayViewer({ plays, opponent, playerMap }: PlayViewerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showFullText, setShowFullText] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);

  const activePlay = plays[activeIdx];
  const nextPlay = activeIdx < plays.length - 1 ? plays[activeIdx + 1] : null;
  // Resolved rather than read directly off activePlay.offense — timeout rows report whichever
  // team called the timeout there, which can be the defense.
  const isMichiganOffense = resolveOffenseTeam(plays, activeIdx) === "Michigan";

  // Dead-ball plays — CFBD records yardsToGoal unreliably (sometimes reflects the next
  // scrimmage play's position after its gain). Use the next scrimmage play's yardsToGoal
  // as the current LOS instead. Same fix applies to kicks/punts whose nextPlay is a dead ball.
  const isDeadBall = isDeadBallPlayType(activePlay);
  // Penalties (e.g. false start) are "NO PLAY" — CFBD's yardsGained on these rows is the
  // penalty distance, not a signed gain/loss, so the real yardage is derived separately.
  // This also covers real plays with a penalty enforced on top (e.g. a run plus a face-mask
  // call tacked on afterward), where yardsGained only covers the underlying play.
  const isPenalty = hasUnreliableYardage(activePlay);
  const penaltyYardsGained = isPenalty ? penaltyYards(plays, activeIdx) : null;
  const effectiveYardsGained = isDeadBall ? 0 : isPenalty ? (penaltyYardsGained ?? 0) : activePlay.yardsGained;

  // Find the next live row (skipping only dead-ball placeholders — a NO-PLAY penalty's own
  // fields are trusted directly, same as everywhere else in this file, rather than skipped past
  // in search of a "real" play. Two NO-PLAY penalties can occur back to back on consecutive
  // downs, and skipping the first would incorrectly pull in the second penalty's own effect.)
  const nextScrimmagePlay = (() => {
    for (let i = activeIdx + 1; i < plays.length; i++) {
      if (!isDeadBallPlayType(plays[i])) return plays[i];
    }
    return null;
  })();

  // Possession-change plays — ball moves in the opposite direction to the listed offense.
  // Use nextScrimmagePlay's starting position for accurate ball placement.
  const isPossessionChange = isPossessionChangePlayType(activePlay);

  // Trustworthy pre-play LOS — chained forward from the last anchor rather than taken at
  // face value from this row's own (sometimes stale) yardsToGoal field.
  const preLosYtg = resolvedPreLosYtg(plays, activeIdx);

  let ballSvgY: number;
  let arrowFromSvgY: number | null = null;
  let arrowToSvgY: number | null = null;
  let gainColor: string;

  if (isDeadBall) {
    // Timeouts/end-of-period don't move the ball — it sits exactly where the last live snap
    // left it. (Deriving this from nextScrimmagePlay would skip past any penalty that occurs
    // before the next real snap and show its post-enforcement spot instead.)
    ballSvgY  = yardsToY(preLosYtg, isMichiganOffense);
    gainColor = "#9ca3af";
  } else if ((isPossessionChange || isPenalty) && nextScrimmagePlay) {
    // Kicks, punts, turnover returns, and penalties: ball sits at the next scrimmage play's
    // starting LOS.
    const fromAbs = absolutePosition(preLosYtg, isMichiganOffense);
    const toAbs   = absolutePosition(nextScrimmagePlay.yardsToGoal, nextScrimmagePlay.offense === "Michigan");
    arrowFromSvgY = absoluteToSvgY(fromAbs);
    arrowToSvgY   = absoluteToSvgY(toAbs);
    if (isPossessionChange) {
      gainColor = "#FFCB05";
    } else {
      // Show gain/loss arrow using the derived penalty yardage
      gainColor = effectiveYardsGained > 0 ? "#22c55e"
        : effectiveYardsGained < 0 ? "#ef4444"
        : "#9ca3af";
    }
    ballSvgY = absoluteToSvgY(toAbs);
  } else {
    // Post-play LOS = resolved pre-play LOS - effectiveYardsGained.
    const displayYtg = preLosYtg - effectiveYardsGained;
    ballSvgY      = yardsToY(displayYtg, isMichiganOffense);
    if (effectiveYardsGained !== 0) {
      arrowFromSvgY = yardsToY(preLosYtg, isMichiganOffense);
      arrowToSvgY   = ballSvgY;
    }
    gainColor = effectiveYardsGained > 0 ? "#22c55e"
      : effectiveYardsGained < 0 ? "#ef4444"
      : "#9ca3af";
  }

  // HUD down & distance — see resolvedDownDistance for why each row's own fields aren't trusted
  // directly.
  const resolvedDD = resolvedDownDistance(plays, activeIdx);
  const hudDown     = (resolvedDD.down     ?? 0) > 0 ? resolvedDD.down     : null;
  const hudDistance = (resolvedDD.distance ?? 0) > 0 ? resolvedDD.distance : null;

  const go = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(plays.length - 1, idx));
      setActiveIdx(clamped);
      setShowFullText(false);
    },
    [plays.length]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        go(activeIdx + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        go(activeIdx - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIdx, go]);

  // Scroll active row into view
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx]);

  const matchedPlayer =
    activePlay.offense === "Michigan"
      ? extractMichiganPlayer(activePlay.playText, playerMap)
      : null;
  const activePlayText = displayPlayText(activePlay.playText);

  // Group plays by drive
  const driveBreaks = new Set<number>();
  for (let i = 1; i < plays.length; i++) {
    if (plays[i].driveNumber !== plays[i - 1].driveNumber) {
      driveBreaks.add(i);
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:flex-1 lg:min-h-0">
      {/* Left — Field + detail + nav */}
      <div className="lg:w-3/5 flex flex-col gap-2 lg:min-h-0">
        {/* Field — fills available height on desktop, fixed aspect on mobile */}
        <div className="lg:flex-1 lg:min-h-0 bg-[var(--surface)] rounded-lg border border-[var(--border)] p-3 flex items-center justify-center overflow-hidden">
          <FootballField
            play={activePlay}
            isMichiganOffense={isMichiganOffense}
            ballSvgY={ballSvgY}
            arrowFromSvgY={arrowFromSvgY}
            arrowToSvgY={arrowToSvgY}
            gainColor={gainColor}
            opponent={opponent}
            hudDown={hudDown}
            hudDistance={hudDistance}
          />
        </div>

        {/* Play detail — fixed height normally, expands only when "more" is pressed */}
        <div className="shrink-0 bg-[var(--surface)] rounded-lg border border-[var(--border)] px-3">
          {showFullText ? (
            /* Expanded: natural height, top-aligned */
            <div className="py-3 flex items-start gap-3">
              {matchedPlayer?.headshotUrl && (
                <img src={matchedPlayer.headshotUrl} alt={matchedPlayer.name}
                  className="w-10 h-10 rounded-full object-cover object-top border-2 border-[var(--um-maize)] shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div className="flex-1 min-w-0">
                {matchedPlayer && (
                  <p className="text-[var(--um-maize)] font-semibold text-xs mb-0.5">
                    {matchedPlayer.name} · <span className="text-gray-400">{matchedPlayer.position}</span>
                  </p>
                )}
                <p className="text-white text-sm leading-snug">{activePlayText}</p>
                <button onClick={() => setShowFullText(false)}
                  className="mt-1 text-xs text-gray-500 hover:text-[var(--um-maize)] transition-colors">
                  ▴ less
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed: fixed 72px, vertically centered, "▾ more" inline */
            <div className="h-[72px] flex items-center gap-3">
              {matchedPlayer?.headshotUrl && (
                <img src={matchedPlayer.headshotUrl} alt={matchedPlayer.name}
                  className="w-10 h-10 rounded-full object-cover object-top border-2 border-[var(--um-maize)] shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div className="flex-1 min-w-0">
                {matchedPlayer && (
                  <p className="text-[var(--um-maize)] font-semibold text-xs mb-0.5">
                    {matchedPlayer.name} · <span className="text-gray-400">{matchedPlayer.position}</span>
                  </p>
                )}
                <p className="text-white text-sm leading-snug line-clamp-2">{activePlayText}</p>
              </div>
              {activePlayText.length > 100 && (
                <button onClick={() => setShowFullText(true)}
                  className="shrink-0 text-xs text-gray-500 hover:text-[var(--um-maize)] transition-colors self-end pb-1">
                  ▾ more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation — fixed height */}
        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => go(activeIdx - 1)}
            disabled={activeIdx === 0}
            className="flex-1 py-2 px-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-white text-sm font-medium disabled:opacity-30 hover:border-[var(--um-maize)]/50 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-gray-500 text-sm whitespace-nowrap">
            {activeIdx + 1} / {plays.length}
          </span>
          <button
            onClick={() => go(activeIdx + 1)}
            disabled={activeIdx === plays.length - 1}
            className="flex-1 py-2 px-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-white text-sm font-medium disabled:opacity-30 hover:border-[var(--um-maize)]/50 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Right — Play log fills full height on desktop */}
      <div className="lg:w-2/5 lg:flex lg:flex-col lg:min-h-0">
        <div className="lg:flex-1 lg:min-h-0 bg-[var(--surface)] rounded-lg border border-[var(--border)] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
            <h2 className="text-white font-semibold text-sm">Play Log</h2>
            <p className="text-gray-500 text-xs mt-0.5">← → arrow keys to navigate</p>
          </div>

          <div
            ref={listRef}
            className="overflow-y-auto flex-1 min-h-0"
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            {plays.map((play, idx) => {
              const isActive = idx === activeIdx;
              const isDriveBreak = driveBreaks.has(idx);
              const isMichOff = play.offense === "Michigan";
              const yards = displayYards(plays, idx);

              return (
                <div key={play.id}>
                  {isDriveBreak && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--surface-2)] border-y border-[var(--border)]">
                      <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                        Drive {play.driveNumber}
                      </span>
                    </div>
                  )}
                  <button
                    ref={isActive ? activeRowRef : undefined}
                    onClick={() => setActiveIdx(idx)}
                    className={`w-full text-left px-4 py-2.5 border-b border-[var(--border)] last:border-0 transition-colors ${
                      isActive
                        ? "bg-[#FFCB05]/10 border-l-2 border-l-[#FFCB05]"
                        : "hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-gray-600 text-xs w-5 shrink-0">{idx + 1}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${playTypeBadgeColor(play.playType)}`}>
                        {shortPlayType(play.playType)}
                      </span>
                      <span className={`text-xs ml-auto shrink-0 font-mono ${
                        yards === null ? "text-gray-600"
                        : yards > 0 ? "text-green-400" : yards < 0 ? "text-red-400" : "text-gray-500"
                      }`}>
                        {yards === null ? "—" : `${yards > 0 ? "+" : ""}${yards} yds`}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed truncate ${isActive ? "text-white" : "text-gray-400"}`}>
                      {isMichOff ? "" : "🔵 "}
                      {displayPlayText(play.playText)}
                    </p>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
