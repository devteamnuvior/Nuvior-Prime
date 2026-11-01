/**
 * Performance phase 4 — award XP for visits logged before the ledger existed.
 * Idempotent: PointEvent rows are unique per (user, reason, source), so
 * re-running only fills gaps. Also rebuilds daily summaries so bonuses and
 * streaks see every day.
 *
 *   npm run xp:backfill
 */
import { prisma } from "../src/lib/prisma";
import { recomputeRepDailySummary } from "../src/lib/performance";
import { awardDailyBonuses, awardPointsForVisit, syncBadges } from "../src/lib/xp";
import { dayKey } from "../src/domain/performance";

async function main() {
  const visits = await prisma.visitRecord.findMany({
    where: { createdByUserId: { not: null }, accountId: { not: null } },
    orderBy: [{ visitDate: "asc" }, { createdAt: "asc" }],
    select: { id: true, createdByUserId: true, visitDate: true },
  });
  console.log(`visits: ${visits.length}`);

  const days = new Map<string, Set<string>>();
  for (const v of visits) {
    const uid = v.createdByUserId!;
    if (!days.has(uid)) days.set(uid, new Set());
    days.get(uid)!.add(dayKey(v.visitDate));
  }
  for (const [uid, set] of days) for (const d of set) await recomputeRepDailySummary(uid, d);

  let awarded = 0;
  for (const v of visits) awarded += await awardPointsForVisit(v.id);
  console.log(`visit awards written: ${awarded}`);

  let bonuses = 0;
  for (const [uid, set] of days) for (const d of [...set].sort()) bonuses += await awardDailyBonuses(uid, d);
  console.log(`daily bonuses written: ${bonuses}`);

  for (const uid of days.keys()) {
    const fresh = await syncBadges(uid);
    const total = await prisma.pointEvent.aggregate({ where: { userId: uid }, _sum: { points: true } });
    console.log(`${uid}: ${total._sum.points ?? 0} XP${fresh.length ? `, new badges ${fresh.join(", ")}` : ""}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
