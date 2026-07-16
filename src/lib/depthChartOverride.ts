/**
 * 2025 Michigan Wolverines depth chart ordering.
 *
 * Keys match the position codes stored in the DB (QB, RB, WR, TE, OL, EDGE, DL, LB, DB, PK, P, LS).
 * Values are player names in depth-chart order (starter → backups).
 *
 * Matching rules (applied per-position group):
 *   - Single-word entry  → exact match on the player's last name
 *   - Multi-word entry   → substring match on the player's full name
 * Players not found in the list are appended sorted by season stat score.
 *
 * Sources: 247Sports fall-camp depth chart projections, Maize n Brew PFF/snap-count
 * data, On3, mgoblue.com roster, and per-game stat leaders from our own DB.
 * Season notes included inline where the situation changed mid-season.
 */

export const DEPTH_CHART_2025: Record<string, string[]> = {
  // ── Offense ───────────────────────────────────────────────────────────────

  // Bryce Underwood (Fr.) was named starter from fall camp. Jadyn Davis
  // backed him up and played in 3 games. Garcia/Keene/Warren were depth.
  QB: ["Underwood", "Davis", "Garcia", "Keene", "Warren", "Herbstreit"],

  // Justice Haynes was the lead back (857 yds, 10 TD through Wk 9) before a
  // season-ending foot injury vs. Michigan State. Jordan Marshall took over
  // and finished with 932 yds / 10 TD on the season.
  RB: ["Marshall", "Haynes", "Parker", "Kuzdzal", "Ka'apana", "Johnson", "Volker", "O'Meara"],

  // McCulley (X, 39 rec / 588 yds) and Marsh (Z, 45 rec / 651 yds) were the
  // two starting outside WRs all season. Morgan was the primary slot (11 g).
  // Bell played 13 games as the 4th receiver.
  WR: [
    "McCulley", "Marsh", "Morgan", "Bell",
    "Browder", "Goodwin", "Moore", "Simpson",
    "Stewart", "Charleston", "Wilcox", "Taylor",
    "O'Leary", "Washington", "Forbes", "Schlecht",
  ],

  // Marlin Klein was the primary TE (24 rec / 248 yds). Max Bredeson operated
  // as an H-back / TE2. Zack Marshall was the backup in-line TE.
  TE: ["Klein", "Bredeson", "Zack Marshall", "Hoffman", "Tonielli", "Owens", "Quinn", "Hansen", "Prieskorn"],

  // Official starting five: Link (LT), El-Hadi (LG), Crippen (C),
  // Norton (RG), Sprague (RT). Evan Link suffered a season-ending knee
  // injury in Wk 8 (vs. Washington); Blake Frazier replaced him at LT.
  OL: [
    "Link", "El-Hadi", "Crippen", "Norton", "Sprague",
    "Frazier", "Guarnera", "Efobi", "Hamilton", "Haywood",
    "Bahr", "Babalola", "Roebuck", "Gach", "Strayhorn",
    "Jones", "Taraboi", "Hattar", "Kavouklis",
  ],

  // ── Defense ───────────────────────────────────────────────────────────────

  // Derrick Moore (EDGE1) earned 1st-team All-Big Ten with 9.5 sacks.
  // TJ Guy was the starting EDGE2 all season.
  EDGE: ["Derrick Moore", "Guy", "Brandt", "Nichols", "Holly", "Baxter", "Edokpayi", "Nate Marshall"],

  // Three-man rotation: Benny (DT), Williams (DT), Pierce (NT/DT).
  // Heavy rotation; Etta and Payne were key rotational pieces.
  DL: ["Benny", "Williams", "Pierce", "Etta", "Payne", "Iwunnah", "Palepale", "Patterson", "Beigel", "Hammond", "Anwunah", "Moten", "Kanka"],

  // Hausmann and Barham were the two listed starters. Rolder finished 2nd on
  // the team in tackles (52); Sullivan led the team with 3 INTs.
  // Barham also played a hybrid edge/pass-rush role at times.
  LB: ["Hausmann", "Barham", "Rolder", "Sullivan", "Bowles", "Hood", "Owusu-Boateng", "Taylor", "Milia", "Ludwig", "Weidenbach"],

  // Hill (CB1) and Berry (CB2) were the outside starters all season.
  // TJ Metcalf was the starting nickel/slot CB (13 games, 6 at S / 7 at nickel).
  // Hillman (545 def. snaps) and Mangham (5 starts) held the safety spots.
  // "TJ Metcalf" / "Tevis Metcalf" are spelled out to avoid last-name collision.
  DB: [
    "Hill", "Berry", "TJ Metcalf", "Hillman", "Mangham",
    "Edmond", "Earls", "Curtis", "Anderson", "Oden",
    "Young", "Rod Moore", "Dotson", "Tevis Metcalf",
    "Sanders", "Winston", "Andrighetto", "Lowe", "Joshua Nichols",
    "Reyes", "Stone",
  ],

  // ── Special Teams ─────────────────────────────────────────────────────────

  // Dominic Zvada returned for 2025 as the starting kicker (also starred in 2023-24).
  // Stuart Blake and Beckham Sunderland are the backups.
  PK: ["Zvada", "Blake", "Sunderland"],

  // Hudson Hollenbeck was the starting punter all 13 games.
  P: ["Hollenbeck", "Robertson"],

  // Greg Tarr started all 13 games, earned 3rd-team All-Big Ten and Michigan
  // Specialist of the Year. He graduated after the season.
  LS: ["Tarr", "Middleton", "Boutorwick"],
};
