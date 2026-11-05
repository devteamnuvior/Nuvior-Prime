/**
 * Performance phase 2 — loads everything the admin per-rep page needs and
 * returns one serializable DTO. Metrics maths lives in src/domain/performance.
 */

import { prisma } from "@/lib/prisma";
import type { AppRoleName } from "@/domain/auth/permissions";
import {
  activityCalendar,
  computeRepKpis,
  dayKey,
  funnel,
  outcomeBreakdown,
  parseDayKey,
  productMix,
  qualityStats,
  rangeFor,
  visitOutcomeLabel,
  weeklySeries,
  type CalendarCell,
  type DailySummaryRow,
  type FunnelStep,
  type OutcomeSlice,
  type ProductMixSlice,
  type QualityStats,
  type RangeKey,
  type RepKpis,
  type TargetProgress,
  type VisitRowInput,
  type WeekPoint,
} from "@/domain/performance";
import { getTargetProgress, listSalesTargets, type SalesTargetRow } from "@/lib/performance";

export type RepProfileUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppRoleName;
  status: "ACTIVE" | "DISABLED";
  provinces: string[];
  territories: string[];
  createdAt: string;
  lastLoginAt: string | null;
};

export type RepRecentVisit = {
  id: string;
  day: string;
  accountName: string;
  city: string | null;
  visitType: string;
  durationMinutes: number;
  outcomeCode: string | null;
  outcomeLabel: string | null;
  nextAction: string | null;
  followUpDate: string | null;
};

export type RepRecentRoute = {
  id: string;
  createdAt: string;
  provinceCode: string;
  stopCount: number;
  dailyVisitTarget: number;
  startQuery: string;
  totalDriveMinutes: number | null;
};

export type RepAuditRow = { id: string; timestamp: string; action: string; resource: string; actor: string | null };

export type RepProfileDto = {
  user: RepProfileUser;
  range: { key: RangeKey; start: string; end: string; days: number };
  today: string;
  kpis: RepKpis;
  weekly: WeekPoint[];
  funnel: FunnelStep[];
  outcomes: OutcomeSlice[];
  productMix: ProductMixSlice[];
  calendar: CalendarCell[];
  quality: QualityStats;
  targets: SalesTargetRow[];
  progress: TargetProgress[];
  recentVisits: RepRecentVisit[];
  recentRoutes: RepRecentRoute[];
  audit: RepAuditRow[];
};

export async function loadRepProfile(userId: string, rangeKey: RangeKey): Promise<RepProfileDto | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const now = new Date();
  const today = dayKey(now);
  const range = rangeFor(rangeKey, now);
  const start = parseDayKey(range.start);
  const endExclusive = new Date(parseDayKey(range.end).getTime() + 86_400_000);

  const [summaryRows, targets, progress, visitRows, stops, recentVisitRows, recentRunRows, auditRows] = await Promise.all([
    prisma.repDailySummary.findMany({
      where: { userId, day: { gte: start, lt: endExclusive } },
      orderBy: { day: "asc" },
    }),
    listSalesTargets(userId),
    getTargetProgress(userId, today),
    prisma.visitRecord.findMany({
      where: { createdByUserId: userId, visitDate: { gte: start, lt: endExclusive } },
      select: { id: true, accountId: true, visitDate: true, outcomeCode: true, followUpDate: true },
    }),
    prisma.visitListItem.findMany({
      where: { run: { createdByUserId: userId, createdAt: { gte: start, lt: endExclusive } } },
      select: { leadProduct: true },
    }),
    prisma.visitRecord.findMany({
      where: { createdByUserId: userId },
      orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
      take: 25,
      include: { account: { select: { businessName: true, city: true } } },
    }),
    prisma.visitListRun.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { items: true } } },
    }),
    prisma.auditEvent.findMany({
      where: { OR: [{ actorUserId: userId }, { resourceType: "User", resourceId: userId }, { resourceType: "SalesTarget", metadata: { path: ["subjectUserId"], equals: userId } }] },
      orderBy: { timestamp: "desc" },
      take: 30,
      include: { actorUser: { select: { email: true } } },
    }),
  ]);

  const summaries: DailySummaryRow[] = summaryRows.map((s) => ({
    day: dayKey(s.day),
    plannedStops: s.plannedStops,
    visits: s.visits,
    visitSlots: s.visitSlots,
    newAccounts: s.newAccounts,
    followUpsDone: s.followUpsDone,
    academySignups: s.academySignups,
    orders: s.orders,
    plannedDriveMinutes: s.plannedDriveMinutes,
    outcomeCounts: (s.outcomeCounts as Partial<Record<string, number>> | null) ?? null,
  }));

  const visits: VisitRowInput[] = visitRows.map((v) => ({
    id: v.id,
    accountId: v.accountId,
    day: dayKey(v.visitDate),
    outcomeCode: v.outcomeCode,
    followUpDate: v.followUpDate ? dayKey(v.followUpDate) : null,
  }));

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      provinces: user.provinces,
      territories: user.territories,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    },
    range: { key: rangeKey, ...range },
    today,
    kpis: computeRepKpis(summaries, targets),
    weekly: weeklySeries(summaries, targets, range.start, range.end),
    funnel: funnel(summaries, visits),
    outcomes: outcomeBreakdown(visits),
    productMix: productMix(stops),
    calendar: activityCalendar(summaries, range.start, range.end),
    quality: qualityStats(visits, today),
    targets,
    progress,
    recentVisits: recentVisitRows.map((v) => ({
      id: v.id,
      day: dayKey(v.visitDate),
      accountName: v.account?.businessName ?? v.placeId ?? "Unknown account",
      city: v.account?.city ?? null,
      visitType: v.visitType,
      durationMinutes: v.durationMinutes,
      outcomeCode: v.outcomeCode ?? null,
      outcomeLabel: visitOutcomeLabel(v.outcomeCode) ?? v.outcome ?? null,
      nextAction: v.nextAction ?? null,
      followUpDate: v.followUpDate ? dayKey(v.followUpDate) : null,
    })),
    recentRoutes: recentRunRows.map((r) => {
      const summary = r.routeSummaryJson as { totalDriveMinutes?: number | null; stopCount?: number } | null;
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        provinceCode: r.provinceCode,
        stopCount: summary?.stopCount ?? r._count.items,
        dailyVisitTarget: r.dailyVisitTarget,
        startQuery: r.startQuery,
        totalDriveMinutes: summary?.totalDriveMinutes ?? null,
      };
    }),
    audit: auditRows.map((e) => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      action: e.action,
      resource: `${e.resourceType}${e.resourceId ? `:${e.resourceId.slice(0, 12)}` : ""}`,
      actor: e.actorUser?.email ?? null,
    })),
  };
}
