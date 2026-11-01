/**
 * Performance phase 1 — persistence for daily summaries and sales targets.
 * Pure rules live in src/domain/performance; this file only touches Prisma.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma, TargetMetric as PrismaTargetMetric, TargetPeriod as PrismaTargetPeriod } from "@prisma/client";
import {
  buildDailySummary,
  dayKey,
  parseDayKey,
  periodRange,
  resolveActiveTarget,
  sumMetric,
  targetProgress,
  isVisitOutcomeCode,
  TARGET_PERIODS,
  type SalesTargetLike,
  type SummaryRunInput,
  type SummaryVisitInput,
  type TargetMetric,
  type TargetPeriod,
  type TargetProgress,
} from "@/domain/performance";

/**
 * Rebuild the RepDailySummary row for one rep and one calendar day from the
 * VisitRecord / VisitListRun rows of that day. Idempotent; safe to call after
 * every visit save. Returns false (and logs) instead of throwing — a summary
 * failure must never block the visit itself.
 */
export async function recomputeRepDailySummary(userId: string, day: string): Promise<boolean> {
  try {
    const dayStart = parseDayKey(day);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const [visits, runs] = await Promise.all([
      prisma.visitRecord.findMany({
        where: { createdByUserId: userId, visitDate: { gte: dayStart, lt: dayEnd } },
        orderBy: { createdAt: "asc" },
        select: { id: true, accountId: true, outcomeCode: true, fitScoreSnapshot: true, visitType: true, createdAt: true },
      }),
      prisma.visitListRun.findMany({
        where: { createdByUserId: userId, createdAt: { gte: dayStart, lt: dayEnd } },
        orderBy: { createdAt: "asc" },
        select: { provinceCode: true, routeSummaryJson: true, _count: { select: { items: true } } },
      }),
    ]);

    const visitInputs: SummaryVisitInput[] = [];
    for (const v of visits) {
      let firstEverVisit = false;
      if (v.accountId) {
        const earlier = await prisma.visitRecord.count({
          where: {
            accountId: v.accountId,
            id: { not: v.id },
            OR: [{ visitDate: { lt: dayStart } }, { visitDate: { gte: dayStart, lt: dayEnd }, createdAt: { lt: v.createdAt } }],
          },
        });
        firstEverVisit = earlier === 0;
      }
      visitInputs.push({
        accountId: v.accountId,
        outcomeCode: isVisitOutcomeCode(v.outcomeCode) ? v.outcomeCode : null,
        fitScoreSnapshot: v.fitScoreSnapshot,
        visitType: v.visitType,
        firstEverVisit,
      });
    }

    const runInputs: SummaryRunInput[] = runs.map((r) => {
      const summary = r.routeSummaryJson as { totalDriveMinutes?: number | null; stopCount?: number } | null;
      return {
        provinceCode: r.provinceCode,
        stopCount: summary?.stopCount ?? r._count.items,
        totalDriveMinutes: summary?.totalDriveMinutes ?? null,
      };
    });

    const values = buildDailySummary({ visits: visitInputs, runs: runInputs });
    const data = {
      provinceCode: values.provinceCode,
      plannedStops: values.plannedStops,
      visits: values.visits,
      qualityVisits: values.qualityVisits,
      newAccounts: values.newAccounts,
      followUpsDone: values.followUpsDone,
      academySignups: values.academySignups,
      orders: values.orders,
      outcomeCounts: values.outcomeCounts as Prisma.InputJsonValue,
      plannedDriveMinutes: values.plannedDriveMinutes,
      avgFitScore: values.avgFitScore,
      computedAt: new Date(),
    };

    await prisma.repDailySummary.upsert({
      where: { userId_day: { userId, day: dayStart } },
      create: { userId, day: dayStart, ...data },
      update: data,
    });
    return true;
  } catch (e) {
    console.warn("[performance] Could not recompute daily summary:", e instanceof Error ? e.message : e);
    return false;
  }
}

export type SalesTargetRow = SalesTargetLike & {
  userId: string;
  note: string | null;
  createdById: string | null;
  updatedAt: string;
};

function toTargetRow(t: {
  id: string;
  userId: string;
  period: PrismaTargetPeriod;
  metric: PrismaTargetMetric;
  value: number;
  startsOn: Date;
  endsOn: Date | null;
  note: string | null;
  createdById: string | null;
  updatedAt: Date;
}): SalesTargetRow {
  return {
    id: t.id,
    userId: t.userId,
    period: t.period,
    metric: t.metric,
    value: t.value,
    startsOn: dayKey(t.startsOn),
    endsOn: t.endsOn ? dayKey(t.endsOn) : null,
    note: t.note,
    createdById: t.createdById,
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function listSalesTargets(userId: string): Promise<SalesTargetRow[]> {
  const rows = await prisma.salesTarget.findMany({
    where: { userId },
    orderBy: [{ period: "asc" }, { metric: "asc" }, { startsOn: "desc" }],
  });
  return rows.map(toTargetRow);
}

export async function upsertSalesTarget(input: {
  userId: string;
  period: TargetPeriod;
  metric: TargetMetric;
  value: number;
  startsOn: string;
  endsOn?: string | null;
  note?: string | null;
  createdById: string;
}): Promise<SalesTargetRow> {
  const startsOn = parseDayKey(input.startsOn);
  const endsOn = input.endsOn ? parseDayKey(input.endsOn) : null;
  const row = await prisma.salesTarget.upsert({
    where: { userId_period_metric_startsOn: { userId: input.userId, period: input.period, metric: input.metric, startsOn } },
    create: {
      userId: input.userId,
      period: input.period,
      metric: input.metric,
      value: input.value,
      startsOn,
      endsOn,
      note: input.note ?? null,
      createdById: input.createdById,
    },
    update: { value: input.value, endsOn, note: input.note ?? null },
  });
  return toTargetRow(row);
}

export async function deleteSalesTarget(id: string): Promise<SalesTargetRow | null> {
  const existing = await prisma.salesTarget.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.salesTarget.delete({ where: { id } });
  return toTargetRow(existing);
}

/**
 * Progress for every target active on `day` for one rep, computed from
 * RepDailySummary rows over each target's period. Targets with no summary rows
 * still appear with actual = 0.
 */
export async function getTargetProgress(userId: string, day: string): Promise<TargetProgress[]> {
  const targets = await listSalesTargets(userId);
  if (!targets.length) return [];

  const active: SalesTargetRow[] = [];
  for (const period of TARGET_PERIODS) {
    const metrics = new Set(targets.filter((t) => t.period === period).map((t) => t.metric));
    for (const metric of metrics) {
      const t = resolveActiveTarget(targets, period, metric, day);
      if (t) active.push(t);
    }
  }
  if (!active.length) return [];

  // One query covers the widest period (month) and we slice per target.
  const month = periodRange("MONTH", day);
  const summaries = await prisma.repDailySummary.findMany({
    where: { userId, day: { gte: parseDayKey(month.start), lte: parseDayKey(month.end) } },
    select: { day: true, visits: true, qualityVisits: true, newAccounts: true, followUpsDone: true, academySignups: true, orders: true },
  });

  return active.map((t) => {
    const { start, end } = periodRange(t.period, day);
    const inRange = summaries.filter((s) => {
      const k = dayKey(s.day);
      return k >= start && k <= end;
    });
    return targetProgress({
      metric: t.metric,
      period: t.period,
      target: t.value,
      actual: sumMetric(inRange, t.metric),
      day,
    });
  });
}
