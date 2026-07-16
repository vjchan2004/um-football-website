import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Michigan Football Analytics",
  description: "Michigan Wolverines football stats, roster, and analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] py-4 text-center text-sm text-gray-500">
          Michigan Football Analytics &mdash; Data via{" "}
          <a
            href="https://collegefootballdata.com"
            className="text-[var(--um-maize)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            collegefootballdata.com
          </a>
        </footer>
      </body>
    </html>
  );
}
