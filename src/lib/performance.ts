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
  resolveDailyVisitsTarget,
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
        select: { id: true, accountId: true, outcomeCode: true, fitScoreSnapshot: true, visitType: true, durationMinutes: true, createdAt: true },
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
        durationMinutes: v.durationMinutes,
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
      visitSlots: values.visitSlots,
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

type SummaryRow = { day: Date; visitSlots: number; newAccounts: number; followUpsDone: number; academySignups: number; orders: number };
const SUMMARY_SELECT = { day: true, visitSlots: true, newAccounts: true, followUpsDone: true, academySignups: true, orders: true } as const;

/**
 * Progress for every target active on `day`, from the rep's targets and their
 * RepDailySummary rows for the month around `day`. Targets with no summary rows
 * still appear with actual = 0. The daily clinic target is always present: the
 * admin-set DAY/VISITS row, or the ten-slot default.
 */
function progressFromRows(targets: readonly SalesTargetLike[], summaries: readonly SummaryRow[], day: string): TargetProgress[] {
  const active: SalesTargetLike[] = [];
  for (const period of TARGET_PERIODS) {
    const metrics = new Set(targets.filter((t) => t.period === period).map((t) => t.metric));
    for (const metric of metrics) {
      const t = resolveActiveTarget(targets, period, metric, day);
      if (t) active.push(t);
    }
  }
  if (!active.some((t) => t.period === "DAY" && t.metric === "VISITS")) active.unshift(resolveDailyVisitsTarget(targets, day));

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

/** Progress for every target active on `day` for one rep. One query covers the widest period (month) and we slice per target. */
export async function getTargetProgress(userId: string, day: string): Promise<TargetProgress[]> {
  const month = periodRange("MONTH", day);
  const [targets, summaries] = await Promise.all([
    listSalesTargets(userId),
    prisma.repDailySummary.findMany({
      where: { userId, day: { gte: parseDayKey(month.start), lte: parseDayKey(month.end) } },
      select: SUMMARY_SELECT,
    }),
  ]);
  return progressFromRows(targets, summaries, day);
}

/**
 * The same progress for many reps at once (the live map polls this every few
 * seconds): two queries for the whole team instead of two per rep. Every id
 * gets an entry, so a rep with no targets still shows the default clinic target.
 */
export async function getTeamTargetProgress(userIds: readonly string[], day: string): Promise<Record<string, TargetProgress[]>> {
  const ids = Array.from(new Set(userIds));
  if (!ids.length) return {};
  const month = periodRange("MONTH", day);
  const [targetRows, summaryRows] = await Promise.all([
    prisma.salesTarget.findMany({ where: { userId: { in: ids } }, orderBy: [{ period: "asc" }, { metric: "asc" }, { startsOn: "desc" }] }),
    prisma.repDailySummary.findMany({
      where: { userId: { in: ids }, day: { gte: parseDayKey(month.start), lte: parseDayKey(month.end) } },
      select: { userId: true, ...SUMMARY_SELECT },
    }),
  ]);
  const targetsBy = new Map<string, SalesTargetRow[]>();
  for (const t of targetRows) {
    const row = toTargetRow(t);
    targetsBy.set(row.userId, [...(targetsBy.get(row.userId) ?? []), row]);
  }
  const summariesBy = new Map<string, SummaryRow[]>();
  for (const s of summaryRows) summariesBy.set(s.userId, [...(summariesBy.get(s.userId) ?? []), s]);

  return Object.fromEntries(ids.map((id) => [id, progressFromRows(targetsBy.get(id) ?? [], summariesBy.get(id) ?? [], day)]));
}
