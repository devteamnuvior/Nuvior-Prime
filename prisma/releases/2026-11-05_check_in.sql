-- Release 2026-11-05 (6): clinic check-in / check-out. A rep checks in on arrival at a stop and
-- checks out when leaving; checking out opens the visit form and the saved VisitRecord links back.
-- Hand-written against prisma/schema.prisma; applied by scripts/predeploy.ts after 2026-11-05_xp_removed.sql, in one transaction.
-- Data moves: none (new table only).

CREATE TABLE "ClinicCheckIn" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "placeId"       TEXT NOT NULL,
  "accountId"     TEXT,
  "checkedInAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checkedOutAt"  TIMESTAMP(3),
  "lat"           DOUBLE PRECISION,
  "lng"           DOUBLE PRECISION,
  "distanceM"     DOUBLE PRECISION,
  "visitRecordId" TEXT,
  CONSTRAINT "ClinicCheckIn_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClinicCheckIn_visitRecordId_key" ON "ClinicCheckIn"("visitRecordId");
CREATE INDEX "ClinicCheckIn_userId_checkedOutAt_idx" ON "ClinicCheckIn"("userId", "checkedOutAt");
CREATE INDEX "ClinicCheckIn_placeId_idx" ON "ClinicCheckIn"("placeId");
ALTER TABLE "ClinicCheckIn" ADD CONSTRAINT "ClinicCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicCheckIn" ADD CONSTRAINT "ClinicCheckIn_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicCheckIn" ADD CONSTRAINT "ClinicCheckIn_visitRecordId_fkey" FOREIGN KEY ("visitRecordId") REFERENCES "VisitRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
