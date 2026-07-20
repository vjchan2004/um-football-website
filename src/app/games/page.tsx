import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/config";
import GameRow from "@/components/GameRow";

async function getGames() {
  try {
    return await prisma.game.findMany({
      where: { season: CURRENT_SEASON },
      orderBy: [{ gameDate: "asc" }],
      include: { teamStats: true },
    });
  } catch {
    return [];
  }
}

export default async function GamesPage() {
  const games = await getGames();

  const michiganGames = games.map((g) => {
    const isHome = g.homeTeam === "Michigan";
    const opponent = isHome ? g.awayTeam : g.homeTeam;
    const umScore = isHome ? g.homeScore : g.awayScore;
    const oppScore = isHome ? g.awayScore : g.homeScore;
    const result =
      umScore != null && oppScore != null
        ? umScore > oppScore ? "W" : umScore < oppScore ? "L" : "T"
        : null;
    const isPostseason = g.conference === "postseason" || g.conference === "bowl";

    const umStats = g.teamStats.find(s => s.team === "Michigan") ?? null;
    const oppStats = g.teamStats.find(s => s.team !== "Michigan") ?? null;

    return { ...g, isHome, opponent, umScore, oppScore, result, isPostseason, umStats, oppStats };
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">{CURRENT_SEASON} Schedule</h1>
        <p className="text-gray-400">
          {games.length} games · click a game for the full box score, or open{" "}
          <span className="text-[var(--um-maize)]">Plays →</span> for an interactive, play-by-play
          field viewer of every drive
        </p>
      </div>

      {games.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
          <p className="text-gray-400">No game data yet. Run ingest to populate.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {michiganGames.map((g, i) => {
            const prevIsRegular = i > 0 && !michiganGames[i - 1].isPostseason;
            return (
              <div key={g.id}>
                {g.isPostseason && prevIsRegular && (
                  <div className="flex items-center gap-3 pt-2 pb-1">
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className="text-xs text-[var(--um-maize)] font-semibold uppercase tracking-widest">Bowl Game</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>
                )}
                <GameRow
                  id={g.id}
                  week={g.week}
                  isHome={g.isHome}
                  opponent={g.opponent}
                  result={g.result as "W" | "L" | "T" | null}
                  umScore={g.umScore}
                  oppScore={g.oppScore}
                  dateLabel={g.gameDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  isPostseason={g.isPostseason}
                  umStats={g.umStats}
                  oppStats={g.oppStats}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
