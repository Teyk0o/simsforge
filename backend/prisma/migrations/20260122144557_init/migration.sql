-- CreateTable
CREATE TABLE "mod_reports" (
    "id" TEXT NOT NULL,
    "modId" INTEGER NOT NULL,
    "machineId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "fakeScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mod_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warned_mods" (
    "id" TEXT NOT NULL,
    "modId" INTEGER NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "isAutoWarned" BOOLEAN NOT NULL DEFAULT false,
    "warningReason" TEXT,
    "creatorId" INTEGER,
    "warnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warned_mods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banned_creators" (
    "id" TEXT NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "creatorName" TEXT NOT NULL,
    "modsBannedCount" INTEGER NOT NULL DEFAULT 0,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banned_creators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mod_reports_modId_idx" ON "mod_reports"("modId");

-- CreateIndex
CREATE INDEX "mod_reports_machineId_idx" ON "mod_reports"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "mod_reports_modId_machineId_key" ON "mod_reports"("modId", "machineId");

-- CreateIndex
CREATE UNIQUE INDEX "warned_mods_modId_key" ON "warned_mods"("modId");

-- CreateIndex
CREATE INDEX "warned_mods_modId_idx" ON "warned_mods"("modId");

-- CreateIndex
CREATE INDEX "warned_mods_creatorId_idx" ON "warned_mods"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "banned_creators_creatorId_key" ON "banned_creators"("creatorId");

-- CreateIndex
CREATE INDEX "banned_creators_creatorId_idx" ON "banned_creators"("creatorId");
