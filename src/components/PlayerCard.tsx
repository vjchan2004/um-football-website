"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export interface SlotPlayer {
  id: number;
  name: string;
  jersey: number | null;
  headshotUrl: string | null;
  year: string | null;
}

export interface SlotData {
  label: string; // e.g. "QB", "WR1", "OL3"
  starter: SlotPlayer | null;
  backups: SlotPlayer[];
}

function lastName(full: string) {
  return full.split(" ").slice(1).join(" ") || full;
}

export default function PlayerCard({ slot }: { slot: SlotData }) {
  const [open, setOpen] = useState(false);
  const { label, starter, backups } = slot;
  const hasBackups = backups.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* ── Card ── */}
      <div
        className={[
          "relative w-20 sm:w-24 rounded-xl overflow-hidden border-2 transition-all duration-200 select-none",
          starter
            ? open
              ? "border-[var(--um-maize)] shadow-[0_0_18px_rgba(255,203,5,0.4)]"
              : "border-[var(--border)] hover:border-[var(--um-maize)]/60 hover:shadow-[0_0_10px_rgba(255,203,5,0.2)]"
            : "border-[var(--border)]/30 opacity-40",
          "bg-[var(--surface)]",
        ].join(" ")}
      >
        {/* Position badge */}
        <div className="absolute top-1.5 left-1.5 z-20">
          <span className="text-[8px] font-black text-[var(--um-maize)] uppercase tracking-wide bg-[var(--um-blue)] px-1.5 py-0.5 rounded leading-none">
            {label}
          </span>
        </div>

        {/* Jersey # */}
        {starter?.jersey != null && (
          <div className="absolute top-1.5 right-1.5 z-20">
            <span className="text-[8px] font-semibold text-white/50 leading-none">
              #{starter.jersey}
            </span>
          </div>
        )}

        {/* Headshot */}
        <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-[var(--um-blue)] to-[var(--surface-2)]">
          {starter?.headshotUrl ? (
            <Image
              src={starter.headshotUrl}
              alt={starter.name}
              fill
              sizes="96px"
              className="object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[var(--um-maize)]/20 text-4xl font-black">M</span>
            </div>
          )}
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--surface)] to-transparent pointer-events-none" />
        </div>

        {/* Name */}
        <div className="px-1.5 pb-2 pt-0.5 text-center min-h-[28px] flex items-center justify-center">
          {starter ? (
            <p className="text-white text-[11px] font-bold leading-tight truncate w-full">
              {lastName(starter.name)}
            </p>
          ) : (
            <p className="text-gray-600 text-[10px] italic">Open</p>
          )}
        </div>

        {/* Profile link — covers the whole card */}
        {starter && (
          <Link
            href={`/players/${starter.id}`}
            className="absolute inset-0 z-20"
            aria-label={`View ${starter.name}'s profile`}
          />
        )}

      </div>

      {/* Expand pill */}
      {hasBackups ? (
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`mt-1.5 w-20 sm:w-24 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 ${
            open
              ? "bg-[var(--um-maize)] text-[var(--um-blue)]"
              : "bg-[var(--surface-2)] text-gray-400 hover:bg-[var(--um-maize)]/15 hover:text-[var(--um-maize)]"
          }`}
        >
          <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
          {backups.length} {backups.length === 1 ? "backup" : "backups"}
        </button>
      ) : (
        <div className="mt-1.5 h-6" />
      )}

      {/* ── Backups panel ── */}
      {open && (
        <div className="w-20 sm:w-24 mt-0.5 bg-[var(--surface)] border border-[var(--um-maize)]/25 rounded-lg overflow-hidden shadow-xl z-10">
          {backups.map((p, i) => (
            <Link
              key={p.id}
              href={`/players/${p.id}`}
              className="flex items-center gap-1.5 px-2 py-1.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="text-[9px] text-gray-600 w-3 shrink-0 text-right font-mono">
                {i + 2}
              </span>
              <div className="relative w-5 h-5 rounded-full overflow-hidden bg-[var(--surface-2)] shrink-0">
                {p.headshotUrl ? (
                  <Image
                    src={p.headshotUrl}
                    alt={p.name}
                    fill
                    sizes="20px"
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[7px] text-gray-600 font-bold">M</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-300 truncate leading-tight">
                  {lastName(p.name)}
                </p>
                {p.year && (
                  <p className="text-[8px] text-gray-600 leading-tight">{p.year}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
