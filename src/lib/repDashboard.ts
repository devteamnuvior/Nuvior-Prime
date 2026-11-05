/**
 * The signed-in rep's own numbers for Today's Route: today's clinic target and
 * the month so far. Reads RepDailySummary and the active targets.
 */

import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/domain/auth/permissions";
import { addDays, dayKey, deltaPercent, parseDayKey, periodDayIndex, periodRange, type TargetProgress } from "@/domain/performance";
import { getTargetProgress } from "@/lib/performance";

export type RepDashboardDto = {
  today: string;
  progress: TargetProgress[];
  month: {
    label: string;
    dayIndex: number;
    visits: number;
    visitsPrev: number;
    visitsDelta: number | null;
    newAccounts: number;
    activeDays: number;
  };
};

export async function loadRepDashboard(user: AuthUser): Promise<RepDashboardDto> {
  const today = dayKey(new Date());

  const month = periodRange("MONTH", today);
  const dayIndex = periodDayIndex("MONTH", today);
  const prevMonth = periodRange("MONTH", addDays(month.start, -1));
  const prevCut = addDays(prevMonth.start, Math.min(dayIndex, Number(prevMonth.end.slice(8))) - 1);

  const [summaries, progress] = await Promise.all([
    prisma.repDailySummary.findMany({
      where: { userId: user.id, day: { gte: parseDayKey(prevMonth.start), lte: parseDayKey(today) } },
      orderBy: { day: "asc" },
      select: { day: true, visits: true, newAccounts: true, plannedStops: true },
    }),
    getTargetProgress(user.id, today),
  ]);

  const rows = summaries.map((s) => ({ ...s, day: dayKey(s.day) }));
  const inMonth = rows.filter((r) => r.day >= month.start && r.day <= month.end);
  const inPrev = rows.filter((r) => r.day >= prevMonth.start && r.day <= prevCut);

  const visits = inMonth.reduce((a, r) => a + r.visits, 0);
  const visitsPrev = inPrev.reduce((a, r) => a + r.visits, 0);
  const newAccounts = inMonth.reduce((a, r) => a + r.newAccounts, 0);
  const activeDays = inMonth.filter((r) => r.visits > 0 || r.plannedStops > 0).length;

  return {
    today,
    progress,
    month: {
      label: new Intl.DateTimeFormat("en-CA", { month: "long", timeZone: "UTC" }).format(parseDayKey(today)),
      dayIndex,
      visits,
      visitsPrev,
      visitsDelta: deltaPercent(visits, visitsPrev),
      newAccounts,
      activeDays,
    },
  };
}
