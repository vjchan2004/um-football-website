-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "cfbId" INTEGER,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "jersey" INTEGER,
    "year" TEXT NOT NULL,
    "height" TEXT,
    "weight" INTEGER,
    "hometown" TEXT,
    "season" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "cfbId" INTEGER,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "gameDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "conference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassingStat" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "passer_rating" DOUBLE PRECISION,

    CONSTRAINT "PassingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RushingStat" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "carries" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "longRun" INTEGER,
    "yardsPerCarry" DOUBLE PRECISION,

    CONSTRAINT "RushingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivingStat" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "receptions" INTEGER NOT NULL DEFAULT 0,
    "targets" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "longReception" INTEGER,

    CONSTRAINT "ReceivingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefensiveStat" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "season" INTEGER NOT NULL,
    "tackles" INTEGER NOT NULL DEFAULT 0,
    "tacklesForLoss" INTEGER NOT NULL DEFAULT 0,
    "sacks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "passBreakups" INTEGER NOT NULL DEFAULT 0,
    "forcedFumbles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DefensiveStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_cfbId_key" ON "Player"("cfbId");

-- CreateIndex
CREATE INDEX "Player_season_position_idx" ON "Player"("season", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Game_cfbId_key" ON "Game"("cfbId");

-- CreateIndex
CREATE UNIQUE INDEX "PassingStat_playerId_gameId_key" ON "PassingStat"("playerId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "RushingStat_playerId_gameId_key" ON "RushingStat"("playerId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivingStat_playerId_gameId_key" ON "ReceivingStat"("playerId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "DefensiveStat_playerId_gameId_key" ON "DefensiveStat"("playerId", "gameId");

-- AddForeignKey
ALTER TABLE "PassingStat" ADD CONSTRAINT "PassingStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassingStat" ADD CONSTRAINT "PassingStat_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RushingStat" ADD CONSTRAINT "RushingStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RushingStat" ADD CONSTRAINT "RushingStat_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingStat" ADD CONSTRAINT "ReceivingStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivingStat" ADD CONSTRAINT "ReceivingStat_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefensiveStat" ADD CONSTRAINT "DefensiveStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefensiveStat" ADD CONSTRAINT "DefensiveStat_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
