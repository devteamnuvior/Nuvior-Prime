-- Release 2026-11-02: performance (targets, daily summaries, XP, badges, challenges), clinic web profiles, live rep positions.
-- Generated with: prisma migrate diff --from-schema-datamodel <schema at deploy repo main 5d4a4a9> --to-schema-datamodel prisma/schema.prisma --script
-- Additive only: new enums, new tables, two nullable VisitRecord columns, indexes, and foreign keys from the new tables.
-- Applied by scripts/predeploy.ts inside a single transaction during the Vercel production build.

-- CreateEnum
CREATE TYPE "VisitOutcome" AS ENUM ('MET_DECISION_MAKER', 'INTERESTED', 'SAMPLE_LEFT', 'QUOTE_REQUESTED', 'ORDER_PLACED', 'ACADEMY_SIGNUP', 'NOT_INTERESTED', 'NOT_AVAILABLE', 'CLOSED_OR_MOVED');

-- CreateEnum
CREATE TYPE "TargetPeriod" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "TargetMetric" AS ENUM ('VISITS', 'QUALITY_VISITS', 'NEW_ACCOUNTS', 'FOLLOW_UPS', 'ACADEMY_SIGNUPS', 'ORDERS');

-- CreateEnum
CREATE TYPE "PointReason" AS ENUM ('VISIT', 'QUALITY_VISIT', 'OUTCOME_SAME_DAY', 'FOLLOW_UP_ON_TIME', 'ACADEMY_SIGNUP', 'FIRST_ORDER', 'DAILY_TARGET_MET', 'STREAK_MILESTONE');

-- AlterTable
ALTER TABLE "VisitRecord" ADD COLUMN     "fitScoreSnapshot" INTEGER,
ADD COLUMN     "outcomeCode" "VisitOutcome";

-- CreateTable
CREATE TABLE "SalesTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" "TargetPeriod" NOT NULL,
    "metric" "TargetMetric" NOT NULL,
    "value" INTEGER NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepDailySummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "provinceCode" TEXT,
    "plannedStops" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "qualityVisits" INTEGER NOT NULL DEFAULT 0,
    "newAccounts" INTEGER NOT NULL DEFAULT 0,
    "followUpsDone" INTEGER NOT NULL DEFAULT 0,
    "academySignups" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "outcomeCounts" JSONB,
    "plannedDriveMinutes" DOUBLE PRECISION,
    "avgFitScore" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "provinceCode" TEXT,
    "reason" "PointReason" NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "points" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "challengeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeCode" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reason" "PointReason" NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "provinceCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepPosition" (
    "userId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracyM" DOUBLE PRECISION,
    "headingDeg" DOUBLE PRECISION,
    "speedMps" DOUBLE PRECISION,
    "accountId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'device',
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepPosition_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ClinicWebProfile" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptVersion" TEXT NOT NULL,
    "profileJson" JSONB NOT NULL,
    "researchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicWebProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesTarget_userId_period_metric_idx" ON "SalesTarget"("userId", "period", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "SalesTarget_userId_period_metric_startsOn_key" ON "SalesTarget"("userId", "period", "metric", "startsOn");

-- CreateIndex
CREATE INDEX "RepDailySummary_day_idx" ON "RepDailySummary"("day");

-- CreateIndex
CREATE UNIQUE INDEX "RepDailySummary_userId_day_key" ON "RepDailySummary"("userId", "day");

-- CreateIndex
CREATE INDEX "PointEvent_userId_day_idx" ON "PointEvent"("userId", "day");

-- CreateIndex
CREATE INDEX "PointEvent_day_idx" ON "PointEvent"("day");

-- CreateIndex
CREATE UNIQUE INDEX "PointEvent_userId_reason_sourceType_sourceId_key" ON "PointEvent"("userId", "reason", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeCode_key" ON "UserBadge"("userId", "badgeCode");

-- CreateIndex
CREATE INDEX "Challenge_startsOn_endsOn_idx" ON "Challenge"("startsOn", "endsOn");

-- CreateIndex
CREATE INDEX "RepPosition_recordedAt_idx" ON "RepPosition"("recordedAt");

-- CreateIndex
CREATE INDEX "RepPosition_accountId_idx" ON "RepPosition"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicWebProfile_clinicId_key" ON "ClinicWebProfile"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicWebProfile_researchedAt_idx" ON "ClinicWebProfile"("researchedAt");

-- CreateIndex
CREATE INDEX "VisitRecord_createdByUserId_visitDate_idx" ON "VisitRecord"("createdByUserId", "visitDate");

-- AddForeignKey
ALTER TABLE "SalesTarget" ADD CONSTRAINT "SalesTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTarget" ADD CONSTRAINT "SalesTarget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepDailySummary" ADD CONSTRAINT "RepDailySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepPosition" ADD CONSTRAINT "RepPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepPosition" ADD CONSTRAINT "RepPosition_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

