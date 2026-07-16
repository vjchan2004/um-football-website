import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRoster, getGames, getGamePlayerStats, parseGamePlayerStats, getSeasonPlayerStats, getKickingStats, getPuntingStats, getTeamGameStats, espnHeadshotUrl } from "@/lib/cfbd";
import { CURRENT_SEASON } from "@/lib/config";

// POST /api/ingest?season=2024
// Protected by CRON_SECRET header for scheduled runs
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = Number(req.nextUrl.searchParams.get("season") ?? CURRENT_SEASON);

  try {
    // 1. Upsert roster — ESPN headshot from CFBD ID
    const rosterData = await getRoster(season);
    const yearMap: Record<number, string> = { 1: "FR", 2: "SO", 3: "JR", 4: "SR", 5: "GR" };

    await Promise.all(
      rosterData.map((p) => {
        const cfbId = Number(p.id);
        const name = `${p.firstName} ${p.lastName}`;
        const yearLabel = p.year >= 2000 ? String(p.year) : (yearMap[p.year] ?? String(p.year));
        const height = p.height ? `${Math.floor(p.height / 12)}-${p.height % 12}` : null;
        const hometown = p.homeCity ? `${p.homeCity}${p.homeState ? `, ${p.homeState}` : ""}` : null;
        const headshotUrl = espnHeadshotUrl(cfbId);

        return prisma.player.upsert({
          where: { cfbId },
          update: { name, position: p.position ?? undefined, jersey: p.jersey, year: yearLabel, height: height ?? undefined, weight: p.weight, hometown: hometown ?? undefined, headshotUrl, season },
          create: { cfbId, name, position: p.position ?? "ATH", jersey: p.jersey, year: yearLabel, height: height ?? undefined, weight: p.weight, hometown: hometown ?? undefined, headshotUrl, season },
        });
      })
    );

    // 2. Upsert games
    const gamesData = await getGames(season);
    await Promise.all(
      gamesData.map((g) =>
        prisma.game.upsert({
          where: { cfbId: g.id },
          update: { homeScore: g.homePoints, awayScore: g.awayPoints },
          create: {
            cfbId: g.id,
            season: g.season,
            week: g.week,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam,
            homeScore: g.homePoints,
            awayScore: g.awayPoints,
            gameDate: new Date(g.startDate),
            venue: g.venue,
            conference: g.seasonType,
          },
        })
      )
    );

    // 3. Fetch and parse per-game player stats + team game stats (regular + postseason)
    const [regularStats, postseasonStats, regularTeamStats, postseasonTeamStats] = await Promise.all([
      getGamePlayerStats(season, "regular"),
      getGamePlayerStats(season, "postseason"),
      getTeamGameStats(season, "regular"),
      getTeamGameStats(season, "postseason"),
    ]);

    const allStatRows = parseGamePlayerStats([...regularStats, ...postseasonStats]);

    // Build lookup maps to resolve IDs
    const [allPlayers, allGames] = await Promise.all([
      prisma.player.findMany({ where: { season }, select: { id: true, cfbId: true } }),
      prisma.game.findMany({ where: { season }, select: { id: true, cfbId: true } }),
    ]);

    const playerByCfbId = new Map(allPlayers.map((p) => [p.cfbId, p.id]));
    const gameByCfbId = new Map(allGames.map((g) => [g.cfbId, g.id]));

    let statsInserted = 0;

    for (const row of allStatRows) {
      const playerId = playerByCfbId.get(row.playerId);
      const gameId = gameByCfbId.get(row.gameId);

      // Skip players not on Michigan's roster (e.g. opponent stats that leaked through)
      if (!playerId || !gameId) continue;

      const ops = [];

      if (row.passing) {
        ops.push(
          prisma.passingStat.upsert({
            where: { playerId_gameId: { playerId, gameId } },
            update: { ...row.passing, season },
            create: { playerId, gameId, season, ...row.passing },
          })
        );
      }

      if (row.rushing) {
        ops.push(
          prisma.rushingStat.upsert({
            where: { playerId_gameId: { playerId, gameId } },
            update: { ...row.rushing, season },
            create: { playerId, gameId, season, ...row.rushing },
          })
        );
      }

      if (row.receiving) {
        ops.push(
          prisma.receivingStat.upsert({
            where: { playerId_gameId: { playerId, gameId } },
            update: { ...row.receiving, season },
            create: { playerId, gameId, season, ...row.receiving },
          })
        );
      }

      if (row.defensive) {
        ops.push(
          prisma.defensiveStat.upsert({
            where: { playerId_gameId: { playerId, gameId } },
            update: { ...row.defensive, season },
            create: { playerId, gameId, season, ...row.defensive },
          })
        );
      }

      await Promise.all(ops);
      statsInserted += ops.length;
    }

    // 4. Upsert team game stats (both teams for each game)
    const allTeamGameStats = [...regularTeamStats, ...postseasonTeamStats];
    for (const game of allTeamGameStats) {
      const gameId = gameByCfbId.get(game.id);
      if (!gameId) continue;
      for (const teamData of game.teams) {
        const s = Object.fromEntries(teamData.stats.map((x) => [x.category, x.stat]));
        const parseEfficiency = (val: string | undefined) => {
          if (!val) return [null, null];
          const [made, att] = val.split("-").map(Number);
          return [isNaN(made) ? null : made, isNaN(att) ? null : att];
        };
        const [thirdConv, thirdAtt] = parseEfficiency(s["thirdDownEff"]);
        const [fourthConv, fourthAtt] = parseEfficiency(s["fourthDownEff"]);
        const [comp, passAtt] = parseEfficiency(s["completionAttempts"]);
        const [pen, penYds] = parseEfficiency(s["totalPenaltiesYards"]);

        const data = {
          isHome: teamData.homeAway === "home",
          totalYards:     s["totalYards"]           ? Number(s["totalYards"])           : null,
          passYards:      s["netPassingYards"]       ? Number(s["netPassingYards"])       : null,
          completions:    comp,
          passAttempts:   passAtt,
          rushYards:      s["rushingYards"]          ? Number(s["rushingYards"])          : null,
          rushAttempts:   s["rushingAttempts"]       ? Number(s["rushingAttempts"])       : null,
          passTDs:        s["passingTDs"]            ? Number(s["passingTDs"])            : null,
          rushTDs:        s["rushingTDs"]            ? Number(s["rushingTDs"])            : null,
          firstDowns:     s["firstDowns"]            ? Number(s["firstDowns"])            : null,
          thirdDownConv:  thirdConv,
          thirdDownAtt:   thirdAtt,
          fourthDownConv: fourthConv,
          fourthDownAtt:  fourthAtt,
          possessionTime: s["possessionTime"]        ?? null,
          penalties:      pen,
          penaltyYards:   penYds,
          turnovers:      s["turnovers"]             ? Number(s["turnovers"])             : null,
          interceptions:  s["interceptions"]         ? Number(s["interceptions"])         : null,
          fumblesLost:    s["fumblesLost"]           ? Number(s["fumblesLost"])           : null,
          sacks:          s["sacks"]                 ? Number(s["sacks"])                 : null,
          tacklesForLoss: s["tacklesForLoss"]        ? Number(s["tacklesForLoss"])        : null,
          qbHurries:      s["qbHurries"]             ? Number(s["qbHurries"])             : null,
        };
        await prisma.teamGameStat.upsert({
          where: { gameId_team: { gameId, team: teamData.team } },
          update: data,
          create: { gameId, team: teamData.team, ...data },
        });
      }
    }

    // 6. Apply season-level interception totals (not available in per-game API)
    // Zero out all per-game records, then set the season total on the player's first game row.
    const intStats = await getSeasonPlayerStats(season, "interceptions");
    const intTotals = new Map<number, number>();
    for (const row of intStats) {
      if (row.statType === "INT") {
        intTotals.set(Number(row.playerId), Number(row.stat));
      }
    }

    for (const [cfbId, total] of intTotals) {
      const playerId = playerByCfbId.get(cfbId);
      if (!playerId) continue;
      // Reset all game records to 0, then apply total to the first one
      const defRecords = await prisma.defensiveStat.findMany({
        where: { playerId, season },
        orderBy: { gameId: "asc" },
        select: { id: true },
      });
      if (defRecords.length === 0) continue;
      await prisma.defensiveStat.updateMany({ where: { playerId, season }, data: { interceptions: 0 } });
      await prisma.defensiveStat.update({ where: { id: defRecords[0].id }, data: { interceptions: total } });
    }

    // 7. Kicking season totals
    const [kickingStats, puntingStats] = await Promise.all([
      getKickingStats(season),
      getPuntingStats(season),
    ]);

    // Group by playerId
    const kickMap = new Map<number, Record<string, number>>();
    for (const row of kickingStats) {
      const id = Number(row.playerId);
      if (!kickMap.has(id)) kickMap.set(id, {});
      kickMap.get(id)![row.statType] = Number(row.stat);
    }
    for (const [cfbId, stats] of kickMap) {
      const playerId = playerByCfbId.get(cfbId);
      if (!playerId) continue;
      await prisma.player.update({
        where: { id: playerId },
        data: {
          fgMade:     stats["FGM"]  ?? null,
          fgAtt:      stats["FGA"]  ?? null,
          fgLong:     stats["LONG"] ?? null,
          xpMade:     stats["XPM"] ?? null,
          xpAtt:      stats["XPA"] ?? null,
          kickingPts: stats["PTS"]  ?? null,
        },
      });
    }

    // Punting — group by playerId
    const puntMap = new Map<number, Record<string, number>>();
    for (const row of puntingStats) {
      const id = Number(row.playerId);
      if (!puntMap.has(id)) puntMap.set(id, {});
      puntMap.get(id)![row.statType] = Number(row.stat);
    }
    for (const [cfbId, stats] of puntMap) {
      const playerId = playerByCfbId.get(cfbId);
      if (!playerId) continue;
      await prisma.player.update({
        where: { id: playerId },
        data: {
          punts:          stats["NO"]    ?? null,
          puntYards:      stats["YDS"]   ?? null,
          puntLong:       stats["LONG"]  ?? null,
          puntIn20:       stats["In 20"] ?? null,
          puntTouchbacks: stats["TB"]    ?? null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      players: rosterData.length,
      headshotsSet: rosterData.length,
      games: gamesData.length,
      statRows: allStatRows.length,
      statsInserted,
      season,
    });
  } catch (err) {
    console.error("Ingest error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
