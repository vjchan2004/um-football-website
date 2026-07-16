import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/config";
import { DEPTH_CHART_2025 } from "@/lib/depthChartOverride";
import DepthChartView, { FormationSection } from "@/components/DepthChartView";
import type { SlotData, SlotPlayer } from "@/components/PlayerCard";

async function getRoster() {
  try {
    return await prisma.player.findMany({
      where: { season: CURRENT_SEASON },
      include: {
        passingStats:   { where: { season: CURRENT_SEASON }, select: { yards: true } },
        rushingStats:   { where: { season: CURRENT_SEASON }, select: { yards: true } },
        receivingStats: { where: { season: CURRENT_SEASON }, select: { yards: true } },
        defensiveStats: { where: { season: CURRENT_SEASON }, select: { tackles: true, sacks: true } },
      },
    });
  } catch {
    return [];
  }
}

type Player = Awaited<ReturnType<typeof getRoster>>[number];

// ── Matching helpers ──────────────────────────────────────────────────────────

/**
 * Returns the index of this player in the override list, or Infinity if absent.
 * Single-word entry  → match player's last name exactly (case-insensitive).
 * Multi-word entry   → check if the player's full name contains the entry.
 */
function overrideIndex(playerName: string, overrideList: string[]): number {
  const fullLower = playerName.toLowerCase();
  const lastLower = fullLower.split(" ").slice(1).join(" ");

  for (let i = 0; i < overrideList.length; i++) {
    const entry = overrideList[i].toLowerCase();
    if (entry.includes(" ")) {
      // Multi-word: exact substring match on full name
      if (fullLower.includes(entry)) return i;
    } else {
      // Single-word: exact last-name match
      if (lastLower === entry) return i;
    }
  }
  return Infinity;
}

/** Season stat score used as tiebreaker for players not in the override. */
function statScore(p: Player): number {
  const pos = p.position ?? "";
  const passYds = p.passingStats.reduce((a, s) => a + s.yards, 0);
  const rushYds = p.rushingStats.reduce((a, s) => a + s.yards, 0);
  const recYds  = p.receivingStats.reduce((a, s) => a + s.yards, 0);
  const tackles = p.defensiveStats.reduce((a, s) => a + s.tackles, 0);
  const sacks   = p.defensiveStats.reduce((a, s) => a + s.sacks, 0);

  switch (pos) {
    case "QB":   return passYds + rushYds;
    case "RB":   return rushYds + recYds;
    case "WR":   return recYds;
    case "TE":   return recYds + rushYds;
    case "EDGE": return tackles + sacks * 5;
    case "DL":   return tackles + sacks * 5;
    case "LB":   return tackles + sacks * 3;
    case "DB":   return tackles + sacks * 3;
    default:     return 0;
  }
}

/**
 * Sort players: override order first, then stat score, then jersey number.
 */
function sortPlayers(players: Player[], posKey: string): Player[] {
  const overrideList = DEPTH_CHART_2025[posKey] ?? [];

  return [...players].sort((a, b) => {
    const idxA = overrideIndex(a.name, overrideList);
    const idxB = overrideIndex(b.name, overrideList);
    if (idxA !== idxB) return idxA - idxB;

    const statDiff = statScore(b) - statScore(a);
    if (statDiff !== 0) return statDiff;

    if (a.jersey == null && b.jersey == null) return 0;
    if (a.jersey == null) return 1;
    if (b.jersey == null) return -1;
    return a.jersey - b.jersey;
  });
}

function toSlotPlayer(p: Player): SlotPlayer {
  return { id: p.id, name: p.name, jersey: p.jersey, headshotUrl: p.headshotUrl, year: p.year };
}

/**
 * Assign sorted players to N named slots.
 * Players 0..n-1 → starters; remaining distributed round-robin as backups.
 */
function buildSlots(players: Player[], slotLabels: string[], posKey: string): SlotData[] {
  const sorted = sortPlayers(players, posKey);
  const n = slotLabels.length;
  const starters = sorted.slice(0, n);
  const rest     = sorted.slice(n);

  return slotLabels.map((label, i) => ({
    label,
    starter: starters[i] ? toSlotPlayer(starters[i]) : null,
    backups: rest.filter((_, j) => j % n === i).map(toSlotPlayer),
  }));
}

export default async function RosterPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const initialTab = tabParam === "defense" || tabParam === "special" ? tabParam : "offense";
  const players = await getRoster();

  const byPos: Record<string, Player[]> = {};
  for (const p of players) {
    const pos = p.position ?? "ATH";
    (byPos[pos] ??= []).push(p);
  }
  const get = (pos: string) => byPos[pos] ?? [];

  // ── Offense ──────────────────────────────────────────────────────────────
  const [wr1, wr2, wr3, wr4]       = buildSlots(get("WR"), ["WR1", "WR2", "WR3", "WR4"], "WR");
  const [ol1, ol2, ol3, ol4, ol5]  = buildSlots(get("OL"), ["LT", "LG", "C", "RG", "RT"], "OL");
  const [qb]                        = buildSlots(get("QB"), ["QB"], "QB");
  const [rb1, rb2]                  = buildSlots(get("RB"), ["RB1", "RB2"], "RB");
  const [te1, te2]                  = buildSlots(get("TE"), ["TE1", "TE2"], "TE");

  // Formation layout: 3 rows — line, QB/WRs spread, RBs directly behind QB
  const offense: FormationSection[] = [
    {
      rows: [
        // Row 1 – line of scrimmage: TEs flank the OL tight together
        { slots: [te1, ol1, ol2, ol3, ol4, ol5, te2], justify: "center", zoneLabel: "Line of Scrimmage", gapBelow: "lg" },
        // Row 2 – WRs spread to edges with QB exactly in the middle (5 cards → QB is #3)
        { slots: [wr1, wr2, qb, wr3, wr4], justify: "between", gapBelow: "sm" },
        // Row 3 – RBs directly behind QB, tight together
        { slots: [rb1, rb2], justify: "center", zoneLabel: "Backfield" },
      ],
    },
  ];

  // ── Defense ──────────────────────────────────────────────────────────────
  const [edge1, edge2]              = buildSlots(get("EDGE"), ["EDGE1", "EDGE2"], "EDGE");
  const [dl1, dl2, dl3]             = buildSlots(get("DL"),   ["DL1", "DL2", "DL3"], "DL");
  const [lb1, lb2, lb3, lb4]        = buildSlots(get("LB"),   ["LB1", "LB2", "LB3", "LB4"], "LB");
  const [db1, db2, db3, db4, db5]   = buildSlots(get("DB"),   ["CB1", "CB2", "CB3", "S1", "S2"], "DB");

  // Formation layout: 3 rows mirroring offense — secondary on top, LBs middle, D-line at bottom
  const defense: FormationSection[] = [
    {
      rows: [
        // Row 1 – secondary: all CBs + safeties spread across the top
        { slots: [db1, db2, db3, db4, db5], justify: "between", zoneLabel: "Secondary", gapBelow: "lg" },
        // Row 2 – linebackers in the middle
        { slots: [lb1, lb2, lb3, lb4], justify: "center", zoneLabel: "Linebackers", gapBelow: "lg" },
        // Row 3 – defensive line at the LOS
        { slots: [edge1, dl1, dl2, dl3, edge2], justify: "center", zoneLabel: "Line of Scrimmage" },
      ],
    },
  ];

  // ── Special Teams ─────────────────────────────────────────────────────────
  const [pk] = buildSlots(get("PK"), ["K"],  "PK");
  const [p]  = buildSlots(get("P"),  ["P"],  "P");
  const [ls] = buildSlots(get("LS"), ["LS"], "LS");

  return (
    <DepthChartView
      offense={offense}
      defense={defense}
      specialTeams={[pk, p, ls]}
      totalPlayers={players.length}
      initialTab={initialTab}
    />
  );
}
