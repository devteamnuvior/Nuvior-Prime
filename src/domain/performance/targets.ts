/**
 * Sales targets (performance phase 1) — pure helpers, no Prisma.
 *
 * A target is a value for a metric over a period (day / week / month). The
 * active target for a date is the one with the latest `startsOn` on or before
 * that date whose `endsOn` is null or on/after the date.
 */

export const TARGET_PERIODS = ["DAY", "WEEK", "MONTH"] as const;
export type TargetPeriod = (typeof TARGET_PERIODS)[number];

export const TARGET_METRICS = [
  "VISITS",
  "QUALITY_VISITS",
  "NEW_ACCOUNTS",
  "FOLLOW_UPS",
  "ACADEMY_SIGNUPS",
  "ORDERS",
] as const;
export type TargetMetric = (typeof TARGET_METRICS)[number];

export const TARGET_METRIC_LABELS: Record<TargetMetric, string> = {
  VISITS: "Visits",
  QUALITY_VISITS: "Quality visits (fit ≥ 4)",
  NEW_ACCOUNTS: "New accounts visited",
  FOLLOW_UPS: "Follow-ups completed",
  ACADEMY_SIGNUPS: "Academy sign-ups",
  ORDERS: "Orders placed",
};

export const TARGET_PERIOD_LABELS: Record<TargetPeriod, string> = {
  DAY: "Daily",
  WEEK: "Weekly",
  MONTH: "Monthly",
};

export type SalesTargetLike = {
  id: string;
  period: TargetPeriod;
  metric: TargetMetric;
  value: number;
  /** YYYY-MM-DD */
  startsOn: string;
  /** YYYY-MM-DD or null (open-ended) */
  endsOn: string | null;
};

/** Calendar date as YYYY-MM-DD, read in UTC (visit dates are stored at UTC midnight). */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDayKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(key: string, days: number): string {
  const d = parseDayKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return dayKey(d);
}

/** Inclusive [start, end] day keys of the period containing `day`. Weeks run Monday–Sunday. */
export function periodRange(period: TargetPeriod, day: string): { start: string; end: string } {
  const d = parseDayKey(day);
  if (period === "DAY") return { start: day, end: day };
  if (period === "WEEK") {
    const dow = d.getUTCDay(); // 0 = Sunday
    const offset = dow === 0 ? 6 : dow - 1;
    const start = addDays(day, -offset);
    return { start, end: addDays(start, 6) };
  }
  const start = `${day.slice(0, 7)}-01`;
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start, end: addDays(dayKey(next), -1) };
}

/** Days in the period (for pace / forecast). */
export function periodLength(period: TargetPeriod, day: string): number {
  const { start, end } = periodRange(period, day);
  return Math.round((parseDayKey(end).getTime() - parseDayKey(start).getTime()) / 86_400_000) + 1;
}

/** 1-based index of `day` within its period. */
export function periodDayIndex(period: TargetPeriod, day: string): number {
  const { start } = periodRange(period, day);
  return Math.round((parseDayKey(day).getTime() - parseDayKey(start).getTime()) / 86_400_000) + 1;
}

export function resolveActiveTarget<T extends SalesTargetLike>(
  targets: readonly T[],
  period: TargetPeriod,
  metric: TargetMetric,
  day: string,
): T | null {
  let best: T | null = null;
  for (const t of targets) {
    if (t.period !== period || t.metric !== metric) continue;
    if (t.startsOn > day) continue;
    if (t.endsOn && t.endsOn < day) continue;
    if (!best || t.startsOn > best.startsOn) best = t;
  }
  return best;
}

export type TargetStatus = "ahead" | "on_track" | "behind" | "met";

export type TargetProgress = {
  metric: TargetMetric;
  period: TargetPeriod;
  target: number;
  actual: number;
  remaining: number;
  /** 0–100, capped at 100 for display; `ratio` keeps the raw value. */
  percent: number;
  ratio: number;
  status: TargetStatus;
  /** Expected actual at this point in the period, assuming an even pace. */
  expectedByNow: number;
  /** Linear forecast for the whole period at the current pace. */
  forecast: number;
  /** 1-based day within the period and the period's length in days. */
  dayIndex: number;
  periodDays: number;
};

export function targetProgress(input: {
  metric: TargetMetric;
  period: TargetPeriod;
  target: number;
  actual: number;
  day: string;
}): TargetProgress {
  const target = Math.max(0, input.target);
  const actual = Math.max(0, input.actual);
  const ratio = target === 0 ? (actual > 0 ? 1 : 0) : actual / target;
  const length = periodLength(input.period, input.day);
  const index = periodDayIndex(input.period, input.day);
  const expectedByNow = Math.round((target * index) / length);
  const forecast = index === 0 ? actual : Math.round((actual * length) / index);

  let status: TargetStatus;
  if (actual >= target && target > 0) status = "met";
  else if (actual >= expectedByNow) status = actual > expectedByNow ? "ahead" : "on_track";
  else status = "behind";

  return {
    metric: input.metric,
    period: input.period,
    target,
    actual,
    remaining: Math.max(0, target - actual),
    percent: Math.min(100, Math.round(ratio * 100)),
    ratio,
    status,
    expectedByNow,
    forecast,
    dayIndex: index,
    periodDays: length,
  };
}
