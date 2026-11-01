/**
 * Performance phase 3 — the signed-in rep's own dashboard data for Today's Route.
 * Reads RepDailySummary, targets and recent visits; copy comes from
 * src/domain/performance/motivation.ts.
 */

import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/domain/auth/permissions";
import {
  addDays,
  buildDayMessage,
  computeStreak,
  dayKey,
  deltaPercent,
  parseDayKey,
  periodDayIndex,
  periodRange,
  qualityStats,
  type DayMessage,
  type Streak,
  type TargetProgress,
} from "@/domain/performance";
import { getTargetProgress, listSalesTargets } from "@/lib/performance";

export type RepDashboardDto = {
  today: string;
  isWorkingDay: boolean;
  progress: TargetProgress[];
  message: DayMessage;
  streak: Streak;
  month: {
    label: string;
    dayIndex: number;
    visits: number;
    visitsPrev: number;
    visitsDelta: number | null;
    qualityShare: number | null;
    newAccounts: number;
    avgFitScore: number | null;
    teamAvgFitScore: number | null;
    activeDays: number;
  };
  /** Visits per day for the last 14 days, oldest first. */
  spark: { day: string; visits: number }[];
  overdueFollowUps: number;
  dueTodayFollowUps: number;
};

export async function loadRepDashboard(user: AuthUser): Promise<RepDashboardDto> {
  const now = new Date();
  const today = dayKey(now);
  const dow = parseDayKey(today).getUTCDay();
  const isWorkingDay = dow !== 0 && dow !== 6;

  const month = periodRange("MONTH", today);
  const dayIndex = periodDayIndex("MONTH", today);
  const prevMonth = periodRange("MONTH", addDays(month.start, -1));
  const prevCut = addDays(prevMonth.start, Math.min(dayIndex, Number(prevMonth.end.slice(8))) - 1);
  const sparkStart = addDays(today, -13);
  const streakStart = addDays(today, -90);
  const since = parseDayKey(streakStart < prevMonth.start ? streakStart : prevMonth.start);

  const [summaries, targets, progress, recentVisits] = await Promise.all([
    prisma.repDailySummary.findMany({
      where: { userId: user.id, day: { gte: since, lte: parseDayKey(today) } },
      orderBy: { day: "asc" },
      select: { day: true, visits: true, qualityVisits: true, newAccounts: true, avgFitScore: true, plannedStops: true },
    }),
    listSalesTargets(user.id),
    getTargetProgress(user.id, today),
    prisma.visitRecord.findMany({
      where: { createdByUserId: user.id, visitDate: { gte: parseDayKey(addDays(today, -120)) } },
      select: { id: true, accountId: true, visitDate: true, outcomeCode: true, fitScoreSnapshot: true, followUpDate: true },
    }),
  ]);

  const rows = summaries.map((s) => ({ ...s, day: dayKey(s.day) }));
  const inMonth = rows.filter((r) => r.day >= month.start && r.day <= month.end);
  const inPrev = rows.filter((r) => r.day >= prevMonth.start && r.day <= prevCut);

  const visits = inMonth.reduce((a, r) => a + r.visits, 0);
  const visitsPrev = inPrev.reduce((a, r) => a + r.visits, 0);
  const qualityVisits = inMonth.reduce((a, r) => a + r.qualityVisits, 0);
  const newAccounts = inMonth.reduce((a, r) => a + r.newAccounts, 0);
  const fitRows = inMonth.filter((r) => r.avgFitScore != null);
  const avgFitScore = fitRows.length ? Math.round((fitRows.reduce((a, r) => a + (r.avgFitScore ?? 0) * r.visits, 0) / Math.max(1, fitRows.reduce((a, r) => a + r.visits, 0))) * 10) / 10 : null;
  const activeDays = inMonth.filter((r) => r.visits > 0 || r.plannedStops > 0).length;

  // Team benchmark: other reps in the same provinces, this month. Aggregate only.
  let teamAvgFitScore: number | null = null;
  if (!user.provinces.includes("*") && user.provinces.length) {
    const team = await prisma.repDailySummary.findMany({
      where: {
        userId: { not: user.id },
        day: { gte: parseDayKey(month.start), lte: parseDayKey(month.end) },
        avgFitScore: { not: null },
        user: { role: "REP", status: "ACTIVE", provinces: { hasSome: user.provinces } },
      },
      select: { avgFitScore: true, visits: true },
    });
    const w = team.reduce((a, r) => a + r.visits, 0);
    if (w > 0) teamAvgFitScore = Math.round((team.reduce((a, r) => a + (r.avgFitScore ?? 0) * r.visits, 0) / w) * 10) / 10;
  }

  const visitInputs = recentVisits.map((v) => ({
    id: v.id,
    accountId: v.accountId,
    day: dayKey(v.visitDate),
    outcomeCode: v.outcomeCode,
    fitScoreSnapshot: v.fitScoreSnapshot,
    followUpDate: v.followUpDate ? dayKey(v.followUpDate) : null,
  }));
  const overdueFollowUps = qualityStats(visitInputs, today).overdueFollowUps;
  const dueTodayFollowUps = visitInputs.filter((v) => v.followUpDate === today && !visitInputs.some((o) => o.id !== v.id && o.accountId && o.accountId === v.accountId && o.day >= today)).length;

  const streak = computeStreak(rows.filter((r) => r.day >= streakStart), targets, today);
  const message = buildDayMessage({ progress, streak, overdueFollowUps, dueTodayFollowUps, isWorkingDay });

  const byDay = new Map(rows.map((r) => [r.day, r.visits] as const));
  const spark: { day: string; visits: number }[] = [];
  for (let d = sparkStart; d <= today; d = addDays(d, 1)) spark.push({ day: d, visits: byDay.get(d) ?? 0 });

  return {
    today,
    isWorkingDay,
    progress,
    message,
    streak,
    month: {
      label: new Intl.DateTimeFormat("en-CA", { month: "long", timeZone: "UTC" }).format(parseDayKey(today)),
      dayIndex,
      visits,
      visitsPrev,
      visitsDelta: deltaPercent(visits, visitsPrev),
      qualityShare: visits > 0 ? Math.round((qualityVisits / visits) * 100) : null,
      newAccounts,
      avgFitScore,
      teamAvgFitScore,
      activeDays,
    },
    spark,
    overdueFollowUps,
    dueTodayFollowUps,
  };
}
