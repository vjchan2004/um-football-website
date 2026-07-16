"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PlayerCard, { SlotData } from "./PlayerCard";

export interface FormationRow {
  slots: SlotData[];
  /**
   * "center"  → cards huddle tightly together (OL, LBs)
   * "between" → cards spread to the edges (WRs, CBs, Safeties)
   */
  justify?: "center" | "between";
  /** Optional faint zone label rendered below the row */
  zoneLabel?: string;
  /**
   * Gap below this row before the next row.
   * "sm" = tight (same field zone, e.g. QB → RBs directly behind)
   * "lg" = large (different zones, e.g. LOS → backfield)
   * Default: "lg"
   */
  gapBelow?: "sm" | "lg";
}

export interface FormationSection {
  rows: FormationRow[];
}

interface Props {
  offense: FormationSection[];
  defense: FormationSection[];
  specialTeams: SlotData[];
  totalPlayers: number;
  initialTab?: Tab;
}

type Tab = "offense" | "defense" | "special";

export default function DepthChartView({ offense, defense, specialTeams, totalPlayers, initialTab = "offense" }: Props) {
  const router = useRouter();
  const [tab, setTabState] = useState<Tab>(initialTab);

  function setTab(t: Tab) {
    setTabState(t);
    const url = t === "offense" ? "/roster" : `/roster?tab=${t}`;
    router.replace(url, { scroll: false });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "offense", label: "Offense" },
    { key: "defense", label: "Defense" },
    { key: "special", label: "Special Teams" },
  ];

  const sections = tab === "offense" ? offense : tab === "defense" ? defense : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">2025 Depth Chart</h1>
        <p className="text-gray-400">
          {totalPlayers} players · click a card to view player profile · click "backups" to expand depth
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-[var(--um-maize)] text-[var(--um-blue)]"
                : "text-gray-400 hover:text-white bg-[var(--surface)] border border-[var(--border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Field panel */}
      <div
        className="rounded-2xl border border-[var(--border)] overflow-x-auto"
        style={{
          background:
            "linear-gradient(180deg, #0a1e10 0%, #0c1a1a 40%, #0d1627 100%)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Faint yard-line overlay */}
        <div
          className="min-w-[640px] px-6 sm:px-10 py-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent, transparent 120px, rgba(255,255,255,0.025) 120px, rgba(255,255,255,0.025) 121px)",
          }}
        >
          {sections ? (
            <div className="flex flex-col gap-14">
              {sections.map((section, si) => (
                <div key={si} className="flex flex-col">
                  {section.rows.map((row, ri) => {
                    const isLast = ri === section.rows.length - 1;
                    const gapClass = isLast
                      ? ""
                      : row.gapBelow === "sm"
                      ? "mb-5"
                      : "mb-12";
                    return (
                      <div key={ri} className={gapClass}>
                        <div
                          className={`flex items-start flex-wrap gap-x-3 gap-y-2 ${
                            row.justify === "between"
                              ? "justify-between"
                              : "justify-center gap-x-2"
                          }`}
                        >
                          {row.slots.map((slot) => (
                            <PlayerCard key={slot.label} slot={slot} />
                          ))}
                        </div>
                        {row.zoneLabel && (
                          <p className="text-center text-[9px] font-semibold text-white/15 uppercase tracking-[0.2em] mt-3">
                            {row.zoneLabel}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            /* Special Teams */
            <div>
              <p className="text-center text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-8">
                Special Teams
              </p>
              <div className="flex justify-center gap-10 flex-wrap">
                {specialTeams.map((slot) => (
                  <PlayerCard key={slot.label} slot={slot} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-600 mt-4">
        2025 depth chart · starters from fall camp / final season order · click a card to view profile
      </p>
    </div>
  );
}
