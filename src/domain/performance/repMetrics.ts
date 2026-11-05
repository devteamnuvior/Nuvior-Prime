/**
 * Rep profile metrics (performance phase 2) — pure. Turns daily summaries,
 * targets, logged visits and planned stops for one rep into the numbers the
 * admin per-rep page renders. No Prisma here; src/lib/repProfile.ts loads data.
 */

import { addDays, dayKey, parseDayKey, periodRange, resolveActiveTarget, resolveDailyVisitsTarget, type SalesTargetLike } from "./targets";
import { visitOutcomeDefinition, isVisitOutcomeCode, type VisitOutcomeCode } from "./visitOutcome";
import type { DailySummaryValues } from "./dailySummary";

export type DailySummaryRow = Pick<
  DailySummaryValues,
  "plannedStops" | "visits" | "visitSlots" | "newAccounts" | "followUpsDone" | "academySignups" | "orders" | "plannedDriveMinutes" | "avgFitScore"
> & { day: string; outcomeCounts: Partial<Record<string, number>> | null };

export type VisitRowInput = {
  id: string;
  accountId: string | null;
  day: string;
  outcomeCode: string | null;
  fitScoreSnapshot: number | null;
  followUpDate: string | null;
};

export type PlannedStopInput = { leadProduct: string; fitScore: number };

export type RepKpis = {
  /** Days with a DAY/VISITS target and any activity where the target was met, as 0–100. Null without a target. */
  targetHitRate: number | null;
  /** Logged visits / planned stops over the range, 0–100 (capped). Null without planned stops. */
  planAdherence: number | null;
  /** Orders / visits where contact was made, 0–100. Null without such visits. */
  visitToOrder: number | null;
  /** Planned drive minutes / logged visits. Null without visits. */
  driveMinutesPerVisit: number | null;
  totals: {
    visits: number;
    plannedStops: number;
    newAccounts: number;
    followUpsDone: number;
    academySignups: number;
    orders: number;
    activeDays: number;
  };
};

export type WeekPoint = { weekStart: string; label: string; visits: number; target: number | null };

export type FunnelStep = { key: string; label: string; value: number };

export type OutcomeSlice = { code: VisitOutcomeCode; label: string; count: number; tone: string };

export type ProductMixSlice = { product: string; count: number; percent: number };

export type CalendarCell = { day: string; visits: number };

export type QualityStats = {
  avgFitScore: number | null;
  /** Share of logged visits carrying a structured outcome, 0–100. */
  outcomeCoverage: number | null;
  overdueFollowUps: number;
};

const POSITIVE: ReadonlySet<VisitOutcomeCode> = new Set(["INTERESTED", "SAMPLE_LEFT", "QUOTE_REQUESTED", "ORDER_PLACED", "ACADEMY_SIGNUP"]);

function pct(num: number, den: number): number | null {
  if (den <= 0) return null;
  return Math.min(100, Math.round((num / den) * 100));
}

export function computeRepKpis(summaries: readonly DailySummaryRow[], targets: readonly SalesTargetLike[]): RepKpis {
  const totals = { visits: 0, plannedStops: 0, newAccounts: 0, followUpsDone: 0, academySignups: 0, orders: 0, activeDays: 0 };
  let driveMinutes = 0;
  let contactVisits = 0;
  let targetDays = 0;
  let targetMetDays = 0;

  for (const s of summaries) {
    const active = s.visits > 0 || s.plannedStops > 0;
    if (!active) continue;
    totals.activeDays += 1;
    totals.visits += s.visits;
    totals.plannedStops += s.plannedStops;
    totals.newAccounts += s.newAccounts;
    totals.followUpsDone += s.followUpsDone;
    totals.academySignups += s.academySignups;
    totals.orders += s.orders;
    driveMinutes += s.plannedDriveMinutes ?? 0;
    for (const [code, n] of Object.entries(s.outcomeCounts ?? {})) {
      if (isVisitOutcomeCode(code) && visitOutcomeDefinition(code).contactMade) contactVisits += n ?? 0;
    }
    targetDays += 1;
    if (s.visitSlots >= resolveDailyVisitsTarget(targets, s.day).value) targetMetDays += 1;
  }

  return {
    targetHitRate: pct(targetMetDays, targetDays),
    planAdherence: pct(totals.visits, totals.plannedStops),
    visitToOrder: pct(totals.orders, contactVisits),
    driveMinutesPerVisit: totals.visits > 0 && driveMinutes > 0 ? Math.round(driveMinutes / totals.visits) : null,
    totals,
  };
}

const weekLabel = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });

/** Visits per Monday-based week across [start, end], with the weekly target (daily VISITS target × 5 working days). */
export function weeklySeries(summaries: readonly DailySummaryRow[], targets: readonly SalesTargetLike[], start: string, end: string): WeekPoint[] {
  const byDay = new Map(summaries.map((s) => [s.day, s] as const));
  const points: WeekPoint[] = [];
  let weekStart = periodRange("WEEK", start).start;
  while (weekStart <= end) {
    const weekEnd = addDays(weekStart, 6);
    let visits = 0;
    for (let d = weekStart; d <= weekEnd; d = addDays(d, 1)) {
      visits += byDay.get(d)?.visits ?? 0;
    }
    const weekly = resolveActiveTarget(targets, "WEEK", "VISITS", weekStart);
    const target = weekly ? weekly.value : resolveDailyVisitsTarget(targets, weekStart).value * 5;
    points.push({ weekStart, label: weekLabel.format(parseDayKey(weekStart)), visits, target });
    weekStart = addDays(weekStart, 7);
  }
  return points;
}

export function funnel(summaries: readonly DailySummaryRow[], visits: readonly VisitRowInput[]): FunnelStep[] {
  let plannedStops = 0;
  for (const s of summaries) plannedStops += s.plannedStops;
  let contact = 0;
  let positive = 0;
  let orders = 0;
  for (const v of visits) {
    if (!isVisitOutcomeCode(v.outcomeCode)) continue;
    if (visitOutcomeDefinition(v.outcomeCode).contactMade) contact += 1;
    if (POSITIVE.has(v.outcomeCode)) positive += 1;
    if (v.outcomeCode === "ORDER_PLACED") orders += 1;
  }
  return [
    { key: "planned", label: "Planned stops", value: plannedStops },
    { key: "visited", label: "Visited", value: visits.length },
    { key: "contact", label: "Decision maker reached", value: contact },
    { key: "positive", label: "Interested or better", value: positive },
    { key: "orders", label: "Orders", value: orders },
  ];
}

export function outcomeBreakdown(visits: readonly VisitRowInput[]): OutcomeSlice[] {
  const counts = new Map<VisitOutcomeCode, number>();
  for (const v of visits) {
    if (!isVisitOutcomeCode(v.outcomeCode)) continue;
    counts.set(v.outcomeCode, (counts.get(v.outcomeCode) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => {
      const def = visitOutcomeDefinition(code);
      return { code, label: def.label, count, tone: def.tone };
    })
    .sort((a, b) => b.count - a.count);
}

export function productMix(stops: readonly PlannedStopInput[]): ProductMixSlice[] {
  const counts = new Map<string, number>();
  for (const s of stops) counts.set(s.leadProduct, (counts.get(s.leadProduct) ?? 0) + 1);
  const total = stops.length;
  return [...counts.entries()]
    .map(([product, count]) => ({ product, count, percent: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** One cell per calendar day in [start, end], oldest first. */
export function activityCalendar(summaries: readonly DailySummaryRow[], start: string, end: string): CalendarCell[] {
  const byDay = new Map(summaries.map((s) => [s.day, s] as const));
  const cells: CalendarCell[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    cells.push({ day: d, visits: byDay.get(d)?.visits ?? 0 });
  }
  return cells;
}

/**
 * A follow-up is overdue when its date is before `today` and the rep has not
 * logged a later visit to the same account on or after that date.
 */
export function qualityStats(visits: readonly VisitRowInput[], today: string): QualityStats {
  let fitSum = 0;
  let fitCount = 0;
  let withOutcome = 0;
  for (const v of visits) {
    if (typeof v.fitScoreSnapshot === "number") {
      fitSum += v.fitScoreSnapshot;
      fitCount += 1;
    }
    if (isVisitOutcomeCode(v.outcomeCode)) withOutcome += 1;
  }

  let overdue = 0;
  for (const v of visits) {
    if (!v.followUpDate || v.followUpDate >= today) continue;
    const covered = visits.some((o) => o.id !== v.id && o.accountId && o.accountId === v.accountId && o.day >= v.followUpDate!);
    if (!covered) overdue += 1;
  }

  return {
    avgFitScore: fitCount ? Math.round((fitSum / fitCount) * 10) / 10 : null,
    outcomeCoverage: pct(withOutcome, visits.length),
    overdueFollowUps: overdue,
  };
}

export type RangeKey = "30" | "90" | "365";

export function rangeFor(range: RangeKey, today: Date = new Date()): { start: string; end: string; days: number } {
  const days = Number(range);
  const end = dayKey(today);
  return { start: addDays(end, -(days - 1)), end, days };
}
