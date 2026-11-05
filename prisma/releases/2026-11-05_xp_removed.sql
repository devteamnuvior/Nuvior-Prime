-- Release 2026-11-05 (4): the competition layer is gone — XP ledger, levels, badges and the leaderboard.
-- Hand-written against prisma/schema.prisma; applied by scripts/predeploy.ts after 2026-11-05_fit_removed.sql, in one transaction.
-- Data moves: none. Points and badges are dropped with their tables; visits, targets and daily summaries are untouched.

DROP TABLE IF EXISTS "UserBadge";
DROP TABLE IF EXISTS "PointEvent";
DROP TYPE IF EXISTS "PointReason";
