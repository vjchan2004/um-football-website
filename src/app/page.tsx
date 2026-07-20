import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/config";

async function getStats() {
  try {
    const [playerCount, gameCount] = await Promise.all([
      prisma.player.count({ where: { season: CURRENT_SEASON } }),
      prisma.game.count({ where: { season: CURRENT_SEASON } }),
    ]);
    return { playerCount, gameCount };
  } catch {
    return { playerCount: 0, gameCount: 0 };
  }
}

export default async function HomePage() {
  const { playerCount, gameCount } = await getStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <div className="inline-block mb-4">
          <span className="text-7xl font-black tracking-tighter text-[var(--um-maize)]">M</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Michigan Football Analytics
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Roster, player stats, and game-by-game breakdowns for the Michigan Wolverines.
        </p>
        <p className="text-gray-500 text-sm mt-3">
          Built by <span className="text-gray-300 font-medium">Victor Chan</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {[
          { label: "Players on Roster", value: playerCount || "—" },
          { label: "Games Tracked", value: gameCount || "—" },
          { label: "Season", value: CURRENT_SEASON },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center"
          >
            <div className="text-3xl font-bold text-[var(--um-maize)] mb-1">{s.value}</div>
            <div className="text-sm text-gray-400 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Featured: Play-by-Play Viewer */}
      <Link
        href="/games/52/plays"
        className="group block bg-[var(--surface)] border-2 border-[var(--um-maize)]/40 hover:border-[var(--um-maize)] rounded-xl p-6 mb-4 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[var(--um-maize)] uppercase tracking-widest">Featured</span>
          <span className="text-xs text-gray-500 bg-[var(--surface-2)] px-2 py-0.5 rounded">New</span>
        </div>
        <h2 className="text-xl font-bold text-white group-hover:text-[var(--um-maize)] transition-colors mb-1">
          Play-by-Play Viewer →
        </h2>
        <p className="text-sm text-gray-400">
          Step through every play with an interactive field visualization, player spotlights, and drive-by-drive breakdowns. Try it on the Texas bowl game.
        </p>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            href: "/roster",
            title: "View Roster",
            desc: "Full depth chart by position with player profiles.",
          },
          {
            href: "/players",
            title: "Player Stats",
            desc: "Passing, rushing, receiving, and defensive analytics.",
          },
          {
            href: "/games",
            title: "Game Log",
            desc: "Season schedule, scores, and game-by-game breakdowns.",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--um-maize)] transition-colors"
          >
            <h2 className="text-lg font-semibold text-white group-hover:text-[var(--um-maize)] transition-colors mb-1">
              {card.title} →
            </h2>
            <p className="text-sm text-gray-400">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
