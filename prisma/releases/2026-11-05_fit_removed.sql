-- Release 2026-11-05 (3): the account fit score is removed — AccountQualification.fitScore, VisitListItem.fitScore, VisitListRun.minFitScore, VisitRecord.fitScoreSnapshot and RepDailySummary.avgFitScore.
-- Hand-written against prisma/schema.prisma; applied by scripts/predeploy.ts after 2026-11-05_quality_visits_removed.sql, in one transaction.
-- Data moves: none needed; the columns are simply dropped.

ALTER TABLE "AccountQualification" DROP COLUMN IF EXISTS "fitScore";
ALTER TABLE "VisitListItem" DROP COLUMN IF EXISTS "fitScore";
ALTER TABLE "VisitListRun" DROP COLUMN IF EXISTS "minFitScore";
ALTER TABLE "VisitRecord" DROP COLUMN IF EXISTS "fitScoreSnapshot";
ALTER TABLE "RepDailySummary" DROP COLUMN IF EXISTS "avgFitScore";
