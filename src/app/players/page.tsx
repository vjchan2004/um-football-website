import Image from "next/image";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CURRENT_SEASON } from "@/lib/config";

async function getLeaders() {
  try {
    const [passing, rushing, receiving, defTackles, defSacks, defInts] = await Promise.all([
      prisma.passingStat.groupBy({
        by: ["playerId"],
        where: { season: CURRENT_SEASON },
        _sum: { yards: true, touchdowns: true, completions: true, attempts: true },
        orderBy: { _sum: { yards: "desc" } },
        take: 5,
      }),
      prisma.rushingStat.groupBy({
        by: ["playerId"],
        where: { season: CURRENT_SEASON },
        _sum: { yards: true, touchdowns: true, carries: true },
        orderBy: { _sum: { yards: "desc" } },
        take: 5,
      }),
      prisma.receivingStat.groupBy({
        by: ["playerId"],
        where: { season: CURRENT_SEASON },
        _sum: { yards: true, touchdowns: true, receptions: true },
        orderBy: { _sum: { yards: "desc" } },
        take: 5,
      }),
      prisma.defensiveStat.groupBy({
        by: ["playerId"],
        where: { season: CURRENT_SEASON },
        _sum: { tackles: true, sacks: true, tacklesForLoss: true },
        orderBy: [{ _sum: { tackles: "desc" } }, { _sum: { tacklesForLoss: "desc" } }],
        take: 5,
      }),
      prisma.defensiveStat.groupBy({
        by: ["playerId"],
        where: { season: CURRENT_SEASON },
        _sum: { sacks: true, tacklesForLoss: true, tackles: true },
        orderBy: [{ _sum: { sacks: "desc" } }, { _sum: { tacklesForLoss: "desc" } }],
        take: 5,
      }),
      prisma.defensiveStat.groupBy({
        by: ["playerId"],
        where: { season: CURRENT_SEASON },
        _sum: { interceptions: true, passBreakups: true },
        orderBy: [{ _sum: { interceptions: "desc" } }, { _sum: { passBreakups: "desc" } }],
        take: 5,
      }),
    ]);

    const allPlayerIds = [
      ...new Set([
        ...passing.map((p) => p.playerId),
        ...rushing.map((p) => p.playerId),
        ...receiving.map((p) => p.playerId),
        ...defTackles.map((p) => p.playerId),
        ...defSacks.map((p) => p.playerId),
        ...defInts.map((p) => p.playerId),
      ]),
    ];

    const players = await prisma.player.findMany({
      where: { id: { in: allPlayerIds } },
    });
    const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

    return { passing, rushing, receiving, defTackles, defSacks, defInts, playerMap };
  } catch {
    return { passing: [], rushing: [], receiving: [], defTackles: [], defSacks: [], defInts: [], playerMap: {} };
  }
}

type PlayerMap = Record<number, { name: string; headshotUrl: string | null }>;

export default async function PlayersPage() {
  const { passing, rushing, receiving, defTackles, defSacks, defInts, playerMap } = await getLeaders();
  const hasData = passing.length > 0 || rushing.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Player Stats</h1>
        <p className="text-gray-400">{CURRENT_SEASON} season leaders</p>
      </div>

      {!hasData ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
          <p className="text-gray-400">No stats yet. Run ingest to populate.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatTable
            title="Passing Yards"
            playerMap={playerMap}
            rows={passing.map((p) => ({
              playerId: p.playerId,
              stats: [
                { label: "YDS", value: p._sum.yards ?? 0 },
                { label: "TD", value: p._sum.touchdowns ?? 0 },
                {
                  label: "CMP%",
                  value: p._sum.attempts
                    ? `${(((p._sum.completions ?? 0) / p._sum.attempts) * 100).toFixed(1)}%`
                    : "—",
                },
              ],
            }))}
          />
          <StatTable
            title="Rushing Yards"
            playerMap={playerMap}
            rows={rushing.map((p) => ({
              playerId: p.playerId,
              stats: [
                { label: "YDS", value: p._sum.yards ?? 0 },
                { label: "TD", value: p._sum.touchdowns ?? 0 },
                { label: "CAR", value: p._sum.carries ?? 0 },
              ],
            }))}
          />
          <StatTable
            title="Receiving Yards"
            playerMap={playerMap}
            rows={receiving.map((p) => ({
              playerId: p.playerId,
              stats: [
                { label: "YDS", value: p._sum.yards ?? 0 },
                { label: "TD", value: p._sum.touchdowns ?? 0 },
                { label: "REC", value: p._sum.receptions ?? 0 },
              ],
            }))}
          />
          <StatTable
            title="Tackle Leaders"
            playerMap={playerMap}
            rows={defTackles.map((p) => ({
              playerId: p.playerId,
              stats: [
                { label: "TKL", value: p._sum.tackles ?? 0 },
                { label: "TFL", value: p._sum.tacklesForLoss ?? 0 },
                { label: "SCK", value: p._sum.sacks ?? 0 },
              ],
            }))}
          />
          <StatTable
            title="Sack Leaders"
            playerMap={playerMap}
            rows={defSacks.map((p) => ({
              playerId: p.playerId,
              stats: [
                { label: "SCK", value: p._sum.sacks ?? 0 },
                { label: "TFL", value: p._sum.tacklesForLoss ?? 0 },
                { label: "TKL", value: p._sum.tackles ?? 0 },
              ],
            }))}
          />
          <StatTable
            title="Interception Leaders"
            playerMap={playerMap}
            rows={defInts.filter((p) => (p._sum.interceptions ?? 0) > 0).map((p) => ({
              playerId: p.playerId,
              stats: [
                { label: "INT", value: p._sum.interceptions ?? 0 },
                { label: "PD", value: p._sum.passBreakups ?? 0 },
              ],
            }))}
          />
        </div>
      )}
    </div>
  );
}

function StatTable({
  title,
  playerMap,
  rows,
}: {
  title: string;
  playerMap: PlayerMap;
  rows: { playerId: number; stats: { label: string; value: number | string }[] }[];
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--um-maize)] uppercase tracking-widest">
          {title}
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-left border-b border-[var(--border)]">
            <th className="px-5 py-2 font-medium">Player</th>
            {rows[0]?.stats.map((s) => (
              <th key={s.label} className="px-3 py-2 font-medium text-right">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const player = playerMap[row.playerId];
            return (
              <tr
                key={row.playerId}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors"
              >
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-600 text-xs w-4 shrink-0">{i + 1}</span>
                    {/* Headshot avatar */}
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[var(--surface-2)] shrink-0">
                      {player?.headshotUrl ? (
                        <Image
                          src={player.headshotUrl}
                          alt={player.name ?? ""}
                          fill
                          sizes="32px"
                          className="object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-bold">M</span>
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/players/${row.playerId}`}
                      className="text-white hover:text-[var(--um-maize)] transition-colors font-medium truncate"
                    >
                      {player?.name ?? `#${row.playerId}`}
                    </Link>
                  </div>
                </td>
                {row.stats.map((s) => (
                  <td key={s.label} className="px-3 py-2.5 text-right text-gray-300 font-mono">
                    {s.value}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
