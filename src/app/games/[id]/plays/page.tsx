import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPlays, CfbdPlay } from "@/lib/cfbd";
import { CURRENT_SEASON } from "@/lib/config";
import PlayViewer from "@/components/PlayViewer";

interface PlayerInfo {
  name: string;
  position: string;
  headshotUrl: string | null;
}

export default async function PlaysPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (isNaN(gameId)) notFound();

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) notFound();

  const isPostseason =
    game.conference === "postseason" ||
    game.conference === "bowl" ||
    game.conference === "playoff";
  const seasonType = isPostseason ? "postseason" : "regular";

  let plays: CfbdPlay[] = [];
  try {
    // For postseason games our DB week is artificial (set to 20 for sorting).
    // CFBD postseason plays are always on week 1.
    const cfbdWeek = seasonType === "postseason" ? 1 : game.week;
    const allPlays = await getPlays(CURRENT_SEASON, cfbdWeek, seasonType);
    // filter to this game by cfbId
    const filtered = game.cfbId
      ? allPlays.filter((p) => p.gameId === game.cfbId)
      : allPlays;
    // CFBD returns plays out of order within drives — sort by drive then play number.
    // End-of-half (Q2) and end-of-game (Q4) plays always close out their drive,
    // so force them last. Q1/Q3 endings happen mid-drive and sort normally.
    const isDriveEndingPeriod = (p: CfbdPlay) =>
      (p.period === 2 || p.period === 4) &&
      ["end of", "end period"].some(t => p.playType.toLowerCase().includes(t));
    plays = filtered.sort((a, b) => {
      if (a.driveNumber !== b.driveNumber) return a.driveNumber - b.driveNumber;
      const aEnd = isDriveEndingPeriod(a), bEnd = isDriveEndingPeriod(b);
      if (aEnd && !bEnd) return 1;
      if (!aEnd && bEnd) return -1;
      return a.playNumber - b.playNumber;
    });
  } catch {
    plays = [];
  }

  // Load Michigan players for name matching
  const players = await prisma.player.findMany({
    where: { season: CURRENT_SEASON },
    select: { name: true, position: true, headshotUrl: true },
  });

  // Build last-name -> PlayerInfo map
  const playerMap: Record<string, PlayerInfo> = {};
  for (const p of players) {
    const parts = p.name.trim().split(/\s+/);
    const lastName = parts[parts.length - 1].toLowerCase();
    // prefer first match (in case of duplicates)
    if (!playerMap[lastName]) {
      playerMap[lastName] = {
        name: p.name,
        position: p.position,
        headshotUrl: p.headshotUrl,
      };
    }
  }

  const isHome = game.homeTeam === "Michigan";
  const opponent = isHome ? game.awayTeam : game.homeTeam;

  return (
    <div className="bg-[var(--um-blue)] lg:h-[calc(100vh-64px)] lg:flex lg:flex-col lg:overflow-hidden">
      <div className="flex flex-col lg:flex-1 lg:min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-4">
        {/* Compact header row */}
        <div className="flex items-center gap-4 mb-3 shrink-0">
          <Link
            href="/games"
            className="text-sm text-gray-400 hover:text-[var(--um-maize)] transition-colors shrink-0"
          >
            ← Games
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight truncate">
              Michigan vs {opponent}
            </h1>
            <p className="text-gray-400 text-xs">
              {isPostseason ? "Postseason" : `Week ${game.week}`} ·{" "}
              {game.gameDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {plays.length > 0 && ` · ${plays.length} plays`}
            </p>
          </div>
        </div>

        {plays.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-12 text-center">
            <p className="text-gray-400">No play-by-play data available for this game.</p>
          </div>
        ) : (
          <PlayViewer
            plays={plays}
            opponent={opponent}
            playerMap={playerMap}
          />
        )}
      </div>
    </div>
  );
}
