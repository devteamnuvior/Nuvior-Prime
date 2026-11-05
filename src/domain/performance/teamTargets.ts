/**
 * Team view of sales targets (live map) — pure, no Prisma.
 *
 * The live map shows many reps at once, so their targets are summed per
 * (period, metric): a team of five with ten clinic slots each is "x / 50 today".
 * Pace and status come from `targetProgress` over the summed values, and the
 * per-rep statuses are counted so the card can say "3 of 5 reps on pace".
 */

import { TARGET_METRICS, TARGET_PERIODS, targetProgress, type TargetMetric, type TargetPeriod, type TargetProgress } from "./targets";

export type TeamTargetStat = {
  /** `${period}-${metric}` — stable React key. */
  key: string;
  period: TargetPeriod;
  metric: TargetMetric;
  /** Progress over the summed target and actual. */
  progress: TargetProgress;
  /** Reps holding this target. */
  reps: number;
  /** Reps who already reached it. */
  repsMet: number;
  /** Reps at or above the expected pace (met, ahead or on track). */
  repsOnPace: number;
};

const PERIOD_ORDER: Record<TargetPeriod, number> = { DAY: 0, WEEK: 1, MONTH: 2 };
const METRIC_ORDER: Record<TargetMetric, number> = Object.fromEntries(TARGET_METRICS.map((m, i) => [m, i])) as Record<TargetMetric, number>;

export function teamTargetKey(period: TargetPeriod, metric: TargetMetric): string {
  return `${period}-${metric}`;
}

/**
 * Sum every rep's active targets per period and metric. `day` is the day the
 * per-rep progress was computed for; it drives the pace of the summed target.
 * Returns day targets first, then week, then month, metrics in catalogue order.
 */
export function aggregateTeamTargets(byRep: Readonly<Record<string, readonly TargetProgress[]>>, day: string): TeamTargetStat[] {
  const sums = new Map<string, { period: TargetPeriod; metric: TargetMetric; target: number; actual: number; reps: number; repsMet: number; repsOnPace: number }>();
  for (const progress of Object.values(byRep)) {
    for (const p of progress) {
      const key = teamTargetKey(p.period, p.metric);
      const s = sums.get(key) ?? { period: p.period, metric: p.metric, target: 0, actual: 0, reps: 0, repsMet: 0, repsOnPace: 0 };
      s.target += p.target;
      s.actual += p.actual;
      s.reps += 1;
      if (p.status === "met") s.repsMet += 1;
      if (p.status !== "behind") s.repsOnPace += 1;
      sums.set(key, s);
    }
  }
  return [...sums.entries()]
    .map(([key, s]) => ({
      key,
      period: s.period,
      metric: s.metric,
      progress: targetProgress({ period: s.period, metric: s.metric, target: s.target, actual: s.actual, day }),
      reps: s.reps,
      repsMet: s.repsMet,
      repsOnPace: s.repsOnPace,
    }))
    .sort((a, b) => PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period] || METRIC_ORDER[a.metric] - METRIC_ORDER[b.metric]);
}

/** Sanity: every period listed exactly once in the sort table (keeps the table honest when a period is added). */
export const TEAM_TARGET_PERIODS: readonly TargetPeriod[] = [...TARGET_PERIODS].sort((a, b) => PERIOD_ORDER[a] - PERIOD_ORDER[b]);
