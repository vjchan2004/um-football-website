import React from "react";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PlayerStatChart from "@/components/PlayerStatChart";
import DefensiveStatChart from "@/components/DefensiveStatChart";
import { CURRENT_SEASON } from "@/lib/config";

async function getPlayer(id: number) {
  return prisma.player.findUnique({
    where: { id },
    include: {
      passingStats: { where: { season: CURRENT_SEASON }, include: { game: true }, orderBy: { game: { week: "asc" } } },
      rushingStats: { where: { season: CURRENT_SEASON }, include: { game: true }, orderBy: { game: { week: "asc" } } },
      receivingStats: { where: { season: CURRENT_SEASON }, include: { game: true }, orderBy: { game: { week: "asc" } } },
      defensiveStats: { where: { season: CURRENT_SEASON }, include: { game: true }, orderBy: { game: { week: "asc" } } },
    },
  });
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(Number(id)).catch(() => null);
  if (!player) notFound();

  const passingChart = player.passingStats.map((s) => ({
    week: s.game.week,
    yards: s.yards,
    touchdowns: s.touchdowns,
  }));
  const rushingChart = player.rushingStats.map((s) => ({
    week: s.game.week,
    yards: s.yards,
    touchdowns: s.touchdowns,
  }));
  const receivingChart = player.receivingStats.map((s) => ({
    week: s.game.week,
    yards: s.yards,
    touchdowns: s.touchdowns,
  }));

  const totalPassYards = player.passingStats.reduce((acc, s) => acc + s.yards, 0);
  const totalRushYards = player.rushingStats.reduce((acc, s) => acc + s.yards, 0);
  const totalRecYards = player.receivingStats.reduce((acc, s) => acc + s.yards, 0);
  const totalTackles = player.defensiveStats.reduce((acc, s) => acc + s.tackles, 0);
  const totalSacks = player.defensiveStats.reduce((acc, s) => acc + s.sacks, 0);
  const totalInterceptions = player.defensiveStats.reduce((acc, s) => acc + s.interceptions, 0);

  const defensiveChart = player.defensiveStats
    .filter((s) => s.tackles > 0 || s.sacks > 0)
    .map((s) => ({
      week: s.game.week,
      tackles: s.tackles,
      sacks: s.sacks,
    }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-start gap-6 mb-10">
        <div className="relative shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 border-[var(--um-maize)] bg-[var(--um-blue)]">
          {player.headshotUrl ? (
            <Image
              src={player.headshotUrl}
              alt={player.name}
              fill
              sizes="96px"
              className="object-cover object-top"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[var(--um-maize)] text-3xl font-black">
                {player.jersey ?? "?"}
              </span>
            </div>
          )}
          {player.headshotUrl && player.jersey != null && (
            <div className="absolute bottom-0 right-0 bg-[var(--um-maize)] text-[var(--um-blue)] text-xs font-black px-1.5 py-0.5 rounded-tl-md">
              #{player.jersey}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">{player.name}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-400">
            <span className="text-[var(--um-maize)] font-semibold">{player.position}</span>
            <span>{player.year}</span>
            {player.height && <span>{player.height}</span>}
            {player.weight && <span>{player.weight} lbs</span>}
            {player.hometown && <span>{player.hometown}</span>}
          </div>
        </div>
      </div>

      {/* Season totals — ordered by position */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {(() => {
          const pos = player.position;
          const pass = totalPassYards > 0 && <StatCard key="pass" label="Pass Yards" value={totalPassYards} />;
          const rush = totalRushYards > 0 && <StatCard key="rush" label="Rush Yards" value={totalRushYards} />;
          const rec  = totalRecYards  > 0 && <StatCard key="rec"  label="Rec Yards"  value={totalRecYards}  />;
          const tkl  = totalTackles   > 0 && <StatCard key="tkl"  label="Tackles"    value={totalTackles}   />;
          const sck  = totalSacks     > 0 && <StatCard key="sck"  label="Sacks"      value={totalSacks}     />;
          const int_ = totalInterceptions > 0 && <StatCard key="int" label="Interceptions" value={totalInterceptions} />;

          // Kicking
          const fgCard  = player.fgMade  != null && <StatCard key="fg"  label="FG" value={`${player.fgMade}/${player.fgAtt}`} />;
          const fgPct   = player.fgAtt   != null && player.fgAtt > 0 && <StatCard key="fgpct" label="FG%" value={`${((player.fgMade! / player.fgAtt) * 100).toFixed(1)}%`} />;
          const fgLong  = player.fgLong  != null && <StatCard key="fglong" label="Long FG" value={`${player.fgLong} yds`} />;
          const xpCard  = player.xpMade  != null && <StatCard key="xp"  label="XP" value={`${player.xpMade}/${player.xpAtt}`} />;
          const ptsCard = player.kickingPts != null && <StatCard key="pts" label="Points" value={player.kickingPts} />;

          // Punting
          const puntsCard = player.punts     != null && <StatCard key="punts"  label="Punts"   value={player.punts} />;
          const yppCard   = player.puntYards != null && player.punts! > 0 && <StatCard key="ypp" label="Avg" value={`${(player.puntYards / player.punts!).toFixed(1)} yds`} />;
          const puntLong  = player.puntLong  != null && <StatCard key="plong"  label="Long Punt" value={`${player.puntLong} yds`} />;
          const in20Card  = player.puntIn20  != null && <StatCard key="in20"   label="Inside 20" value={player.puntIn20} />;

          let order;
          if (pos === "QB")  order = [pass, rush, rec, tkl, sck, int_];
          else if (pos === "RB") order = [rush, rec, pass, tkl, sck, int_];
          else if (pos === "WR" || pos === "TE") order = [rec, rush, pass, tkl, sck, int_];
          else if (pos === "PK") order = [fgCard, fgPct, fgLong, xpCard, ptsCard, puntsCard, yppCard, puntLong];
          else if (pos === "P")  order = [puntsCard, yppCard, puntLong, in20Card];
          else order = [tkl, sck, int_, pass, rush, rec];

          return order.filter(Boolean);
        })()}
      </div>

      {/* Charts — ordered by position */}
      {(() => {
        const pos = player.position;
        const passing = passingChart.length > 0 && <ChartSection key="pass" title="Passing Yards by Week" data={passingChart} />;
        const rushing = rushingChart.length > 0 && <ChartSection key="rush" title="Rushing Yards by Week" data={rushingChart} />;
        const receiving = receivingChart.length > 0 && <ChartSection key="rec" title="Receiving Yards by Week" data={receivingChart} />;

        let order;
        if (pos === "QB") order = [passing, rushing, receiving];
        else if (pos === "RB") order = [rushing, receiving, passing];
        else if (pos === "WR" || pos === "TE") order = [receiving, rushing, passing];
        else order = [passing, rushing, receiving];

        return order.filter(Boolean);
      })()}

      {defensiveChart.length > 0 && (
        <ChartSection title="Tackles & Sacks by Week" chart={<DefensiveStatChart data={defensiveChart} />} />
      )}

      {passingChart.length === 0 && rushingChart.length === 0 && receivingChart.length === 0 && totalTackles === 0 && player.fgMade == null && player.punts == null && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
          <p className="text-gray-400">No game stats available for this player yet.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-[var(--um-maize)]">{value}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

function ChartSection({
  title,
  data,
  chart,
}: {
  title: string;
  data?: { week: number; yards: number; touchdowns: number }[];
  chart?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-4">
      <h2 className="text-sm font-semibold text-[var(--um-maize)] uppercase tracking-widest mb-4">
        {title}
      </h2>
      {chart ?? (data && <PlayerStatChart data={data} />)}
    </div>
  );
}
