// college-football-data.com API client
// Get a free API key at https://collegefootballdata.com/key

const BASE_URL = "https://api.collegefootballdata.com";
const TEAM = "Michigan";
// ESPN CDN headshot URL — CFBD player IDs map directly to ESPN's CDN IDs
export function espnHeadshotUrl(cfbdId: number): string {
  return `https://a.espncdn.com/i/headshots/college-football/players/full/${cfbdId}.png`;
}

function getHeaders() {
  const key = process.env.CFBD_API_KEY;
  if (!key) throw new Error("CFBD_API_KEY is not set in environment variables");
  return {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
}

async function cfbdFetch<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), { headers: getHeaders(), next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`CFBD API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface CfbdPlayer {
  id: string;          // comes as string from API
  firstName: string;
  lastName: string;
  position: string | null;
  jersey: number | null;
  year: number;        // calendar year (e.g. 2024) or class year (1-5)
  height: number | null; // inches
  weight: number | null;
  homeCity: string | null;
  homeState: string | null;
}

export interface CfbdGame {
  id: number;
  season: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
  homePoints: number | null;
  awayPoints: number | null;
  startDate: string;
  venue: string | null;
  seasonType: string;
}

export interface CfbdGamePlayerStats {
  id: number; // game id
  teams: {
    team: string;
    categories: {
      name: string;
      types: {
        name: string;
        athletes: { id: string; name: string; stat: string }[];
      }[];
    }[];
  }[];
}

export function getRoster(season: number) {
  return cfbdFetch<CfbdPlayer[]>("/roster", { team: TEAM, year: season });
}

export function getGames(season: number) {
  return cfbdFetch<CfbdGame[]>("/games", { team: TEAM, year: season, seasonType: "both" });
}

export function getGamePlayerStats(season: number, seasonType: "regular" | "postseason") {
  return cfbdFetch<CfbdGamePlayerStats[]>("/games/players", {
    year: season,
    team: TEAM,
    seasonType,
  });
}

export interface CfbdPlayerSeasonStat {
  playerId: string;
  player: string;
  team: string;
  category: string;
  statType: string;
  stat: string;
}

// The per-game stats API doesn't include defensive interceptions — fetch season totals separately
export function getSeasonPlayerStats(season: number, category: string) {
  return cfbdFetch<CfbdPlayerSeasonStat[]>("/stats/player/season", { year: season, team: TEAM, category });
}

export interface CfbdTeamGameStat {
  id: number; // game id
  teams: {
    teamId: number;
    team: string;
    homeAway: "home" | "away";
    points: number;
    stats: { category: string; stat: string }[];
  }[];
}

export function getTeamGameStats(season: number, seasonType: "regular" | "postseason") {
  return cfbdFetch<CfbdTeamGameStat[]>("/games/teams", { year: season, team: TEAM, seasonType });
}

export function getKickingStats(season: number) {
  return getSeasonPlayerStats(season, "kicking");
}

export function getPuntingStats(season: number) {
  return getSeasonPlayerStats(season, "punting");
}

export interface CfbdPlay {
  gameId: number;
  driveId: string;
  id: string;
  driveNumber: number;
  playNumber: number;
  offense: string;
  offenseScore: number;
  defense: string;
  defenseScore: number;
  home: string;
  away: string;
  period: number;
  clock: { minutes: number; seconds: number };
  yardline: number;
  yardsToGoal: number;
  down: number | null;
  distance: number | null;
  yardsGained: number;
  scoring: boolean;
  playType: string;
  playText: string;
  wallclock: string | null;
}

export function getPlays(season: number, week: number, seasonType: "regular" | "postseason") {
  return cfbdFetch<CfbdPlay[]>("/plays", {
    year: season,
    week,
    team: TEAM,
    seasonType,
  });
}

// Pivot the nested API response into a flat per-player-per-game stat map
export interface PlayerGameStatRow {
  gameId: number;
  playerId: number;
  passing: { completions: number; attempts: number; yards: number; touchdowns: number; interceptions: number } | null;
  rushing: { carries: number; yards: number; touchdowns: number; longRun: number | null } | null;
  receiving: { receptions: number; yards: number; touchdowns: number; longReception: number | null } | null;
  defensive: { tackles: number; sacks: number; tacklesForLoss: number; passBreakups: number; interceptions: number } | null;
}

export function parseGamePlayerStats(games: CfbdGamePlayerStats[]): PlayerGameStatRow[] {
  const rows: PlayerGameStatRow[] = [];

  for (const game of games) {
    const michiganTeam = game.teams.find((t) => t.team === TEAM);
    if (!michiganTeam) continue;

    // Build per-player stat map for this game
    const playerStats = new Map<number, PlayerGameStatRow>();

    const getOrCreate = (id: number): PlayerGameStatRow => {
      if (!playerStats.has(id)) {
        playerStats.set(id, { gameId: game.id, playerId: id, passing: null, rushing: null, receiving: null, defensive: null });
      }
      return playerStats.get(id)!;
    };

    for (const cat of michiganTeam.categories) {
      const typeMap = Object.fromEntries(cat.types.map((t) => [t.name, t.athletes]));

      if (cat.name === "passing") {
        const catt = typeMap["C/ATT"] ?? [];
        for (const athlete of catt) {
          const pid = Number(athlete.id);
          const [comp, att] = athlete.stat.split("/").map(Number);
          const row = getOrCreate(pid);
          row.passing = {
            completions: comp || 0,
            attempts: att || 0,
            yards: Number(typeMap["YDS"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
            touchdowns: Number(typeMap["TD"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
            interceptions: Number(typeMap["INT"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
          };
        }
      }

      if (cat.name === "rushing") {
        const carriers = typeMap["CAR"] ?? [];
        for (const athlete of carriers) {
          const pid = Number(athlete.id);
          const row = getOrCreate(pid);
          row.rushing = {
            carries: Number(athlete.stat),
            yards: Number(typeMap["YDS"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
            touchdowns: Number(typeMap["TD"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
            longRun: Number(typeMap["LONG"]?.find((a) => a.id === athlete.id)?.stat ?? null) || null,
          };
        }
      }

      if (cat.name === "receiving") {
        const receivers = typeMap["REC"] ?? [];
        for (const athlete of receivers) {
          const pid = Number(athlete.id);
          const row = getOrCreate(pid);
          row.receiving = {
            receptions: Number(athlete.stat),
            yards: Number(typeMap["YDS"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
            touchdowns: Number(typeMap["TD"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
            longReception: Number(typeMap["LONG"]?.find((a) => a.id === athlete.id)?.stat ?? null) || null,
          };
        }
      }

      if (cat.name === "defensive") {
        const tacklers = typeMap["TOT"] ?? [];
        for (const athlete of tacklers) {
          const pid = Number(athlete.id);
          const row = getOrCreate(pid);
          row.defensive = {
            tackles: Number(athlete.stat),
            sacks: Number(typeMap["SACKS"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
            tacklesForLoss: Number(typeMap["TFL"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
            passBreakups: Number(typeMap["PD"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
            interceptions: Number(typeMap["INT"]?.find((a) => a.id === athlete.id)?.stat ?? 0),
          };
        }
      }
    }

    rows.push(...playerStats.values());
  }

  return rows;
}
