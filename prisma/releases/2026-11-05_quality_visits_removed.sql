-- Release 2026-11-05 (2): quality visits removed — the QUALITY_VISITS target metric, the QUALITY_VISIT point reason, the Quality focus badge and RepDailySummary.qualityVisits.
-- Hand-written against prisma/schema.prisma; applied by scripts/predeploy.ts after 2026-11-05_clinic_slots.sql, in one transaction.
-- Data moves: QUALITY_VISITS targets are deleted, QUALITY_VISIT ledger rows become VISIT (their points are kept), QUALITY_FOCUS badges are deleted.

-- Targets: drop the metric's rows, then the enum value
DELETE FROM "SalesTarget" WHERE "metric" = 'QUALITY_VISITS';
ALTER TYPE "TargetMetric" RENAME TO "TargetMetric_old";
CREATE TYPE "TargetMetric" AS ENUM ('VISITS', 'NEW_ACCOUNTS', 'FOLLOW_UPS', 'ACADEMY_SIGNUPS', 'ORDERS');
ALTER TABLE "SalesTarget" ALTER COLUMN "metric" TYPE "TargetMetric" USING ("metric"::text::"TargetMetric");
DROP TYPE "TargetMetric_old";

-- XP ledger: a visit earned either QUALITY_VISIT or VISIT, never both, so the unique key stays intact
UPDATE "PointEvent" SET "reason" = 'VISIT' WHERE "reason" = 'QUALITY_VISIT';
ALTER TYPE "PointReason" RENAME TO "PointReason_old";
CREATE TYPE "PointReason" AS ENUM ('VISIT', 'OUTCOME_SAME_DAY', 'FOLLOW_UP_ON_TIME', 'ACADEMY_SIGNUP', 'FIRST_ORDER', 'DAILY_TARGET_MET', 'STREAK_MILESTONE');
ALTER TABLE "PointEvent" ALTER COLUMN "reason" TYPE "PointReason" USING ("reason"::text::"PointReason");
DROP TYPE "PointReason_old";

-- Badge and daily column
DELETE FROM "UserBadge" WHERE "badgeCode" = 'QUALITY_FOCUS';
ALTER TABLE "RepDailySummary" DROP COLUMN IF EXISTS "qualityVisits";
