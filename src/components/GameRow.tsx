"use client";
import { useState } from "react";
import Link from "next/link";

interface TeamStat {
  team: string;
  totalYards: number | null;
  passYards: number | null;
  completions: number | null;
  passAttempts: number | null;
  rushYards: number | null;
  rushAttempts: number | null;
  firstDowns: number | null;
  thirdDownConv: number | null;
  thirdDownAtt: number | null;
  turnovers: number | null;
  sacks: number | null;
  tacklesForLoss: number | null;
  possessionTime: string | null;
  penalties: number | null;
  penaltyYards: number | null;
}

interface GameRowProps {
  id: number;
  week: number | string;
  isHome: boolean;
  opponent: string;
  result: "W" | "L" | "T" | null;
  umScore: number | null;
  oppScore: number | null;
  dateLabel: string;
  isPostseason: boolean;
  umStats: TeamStat | null;
  oppStats: TeamStat | null;
}

function StatRow({ label, um, opp }: { label: string; um: string; opp: string }) {
  return (
    <div className="grid grid-cols-3 text-sm py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-white font-mono text-right pr-4">{um}</span>
      <span className="text-gray-500 text-center text-xs uppercase tracking-wide">{label}</span>
      <span className="text-white font-mono text-left pl-4">{opp}</span>
    </div>
  );
}

export default function GameRow({ id, week, isHome, opponent, result, umScore, oppScore, dateLabel, isPostseason, umStats, oppStats }: GameRowProps) {
  const [open, setOpen] = useState(false);
  const hasStats = umStats != null && oppStats != null;

  return (
    <div className="rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--um-maize)]/40 transition-colors">
      {/* Score row */}
      <button
        onClick={() => hasStats && setOpen(v => !v)}
        className={`w-full flex items-center gap-4 bg-[var(--surface)] px-5 py-3 ${hasStats ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className="text-gray-500 text-sm w-16 shrink-0 text-left">
          {isPostseason ? "Bowl" : `Wk ${week}`}
        </span>
        <span className="text-gray-400 text-sm w-6 shrink-0">{isHome ? "vs" : "@"}</span>
        <span className="text-white font-medium flex-1 text-left">{opponent}</span>
        {result ? (
          <span className={`font-bold text-sm px-2.5 py-0.5 rounded shrink-0 ${
            result === "W" ? "bg-green-900/40 text-green-400"
            : result === "L" ? "bg-red-900/40 text-red-400"
            : "bg-gray-700 text-gray-300"
          }`}>
            {result} {umScore}–{oppScore}
          </span>
        ) : (
          <span className="text-gray-500 text-sm shrink-0">{dateLabel}</span>
        )}
        <Link
          href={`/games/${id}/plays`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-semibold text-[var(--um-blue)] bg-[var(--um-maize)] hover:bg-[var(--um-maize)]/80 transition-colors shrink-0 px-2.5 py-1 rounded"
        >
          Plays →
        </Link>
        {hasStats && (
          <span className={`text-gray-500 text-xs ml-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
        )}
      </button>

      {/* Box score */}
      {open && umStats && oppStats && (
        <div className="bg-[var(--surface-2)] border-t border-[var(--border)] px-5 py-4">
          {/* Team headers */}
          <div className="grid grid-cols-3 mb-3">
            <span className="text-[var(--um-maize)] font-bold text-sm text-right pr-4">Michigan</span>
            <span />
            <span className="text-gray-300 font-bold text-sm text-left pl-4">{opponent}</span>
          </div>

          <StatRow label="Total Yards"
            um={umStats.totalYards?.toString() ?? "—"}
            opp={oppStats.totalYards?.toString() ?? "—"} />
          <StatRow label="Passing"
            um={umStats.passAttempts != null ? `${umStats.completions}/${umStats.passAttempts}, ${umStats.passYards} yds` : "—"}
            opp={oppStats.passAttempts != null ? `${oppStats.completions}/${oppStats.passAttempts}, ${oppStats.passYards} yds` : "—"} />
          <StatRow label="Rushing"
            um={umStats.rushAttempts != null ? `${umStats.rushAttempts} att, ${umStats.rushYards} yds` : "—"}
            opp={oppStats.rushAttempts != null ? `${oppStats.rushAttempts} att, ${oppStats.rushYards} yds` : "—"} />
          <StatRow label="1st Downs"
            um={umStats.firstDowns?.toString() ?? "—"}
            opp={oppStats.firstDowns?.toString() ?? "—"} />
          <StatRow label="3rd Down"
            um={umStats.thirdDownAtt != null ? `${umStats.thirdDownConv}/${umStats.thirdDownAtt}` : "—"}
            opp={oppStats.thirdDownAtt != null ? `${oppStats.thirdDownConv}/${oppStats.thirdDownAtt}` : "—"} />
          <StatRow label="Turnovers"
            um={umStats.turnovers?.toString() ?? "—"}
            opp={oppStats.turnovers?.toString() ?? "—"} />
          <StatRow label="Sacks"
            um={umStats.sacks?.toString() ?? "—"}
            opp={oppStats.sacks?.toString() ?? "—"} />
          <StatRow label="TFL"
            um={umStats.tacklesForLoss?.toString() ?? "—"}
            opp={oppStats.tacklesForLoss?.toString() ?? "—"} />
          <StatRow label="Penalties"
            um={umStats.penalties != null ? `${umStats.penalties}-${umStats.penaltyYards} yds` : "—"}
            opp={oppStats.penalties != null ? `${oppStats.penalties}-${oppStats.penaltyYards} yds` : "—"} />
          <StatRow label="Possession"
            um={umStats.possessionTime ?? "—"}
            opp={oppStats.possessionTime ?? "—"} />
        </div>
      )}
    </div>
  );
}
