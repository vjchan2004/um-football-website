"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/roster", label: "Roster" },
  { href: "/players", label: "Players" },
  { href: "/games", label: "Games" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-8 h-14">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="text-[var(--um-maize)]">M</span>
          <span className="text-white">ICHIGAN</span>
          <span className="text-[var(--um-maize)] ml-1 text-xs font-normal uppercase tracking-widest">
            Football
          </span>
        </Link>
        <div className="flex gap-1 ml-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-[var(--um-maize)] text-[var(--um-blue)]"
                  : "text-gray-400 hover:text-white hover:bg-[var(--surface-2)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
