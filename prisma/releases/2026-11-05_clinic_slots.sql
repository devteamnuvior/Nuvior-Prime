-- Release 2026-11-05: clinic slots (45 / 90-minute visits count 1 / 2 toward the daily ten), challenges removed, MANAGER role retired.
-- Hand-written against prisma/schema.prisma; applied by scripts/predeploy.ts after 2026-11-02_performance_live_map.sql, in one transaction.
-- Data moves: existing visits are 45 minutes (one slot), RepDailySummary.visitSlots starts equal to visits, MANAGER users become ADMIN.

-- Visit duration and daily slots
ALTER TABLE "VisitRecord" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 45;
ALTER TABLE "RepDailySummary" ADD COLUMN "visitSlots" INTEGER NOT NULL DEFAULT 0;
UPDATE "RepDailySummary" SET "visitSlots" = "visits";

-- Challenges: unlink the ledger, then drop the table
ALTER TABLE "PointEvent" DROP CONSTRAINT IF EXISTS "PointEvent_challengeId_fkey";
ALTER TABLE "PointEvent" DROP COLUMN IF EXISTS "challengeId";
ALTER TABLE "PointEvent" DROP COLUMN IF EXISTS "multiplier";
DROP TABLE IF EXISTS "Challenge";

-- Roles: MANAGER becomes ADMIN, then the enum value goes
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'MANAGER';
ALTER TYPE "AppRole" RENAME TO "AppRole_old";
CREATE TYPE "AppRole" AS ENUM ('REP', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "AppRole" USING ("role"::text::"AppRole");
DROP TYPE "AppRole_old";
