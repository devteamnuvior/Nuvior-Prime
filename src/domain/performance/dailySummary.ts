/**
 * Daily summary builder (performance phase 1) — pure. Given the visits a rep
 * logged on a day and the routes they built that day, produce the numbers that
 * land in `RepDailySummary`. Persistence lives in src/lib/performance.ts.
 */

import type { VisitOutcomeCode } from "./visitOutcome";
import type { TargetMetric } from "./targets";
import { slotsForDuration } from "./visitSlots";

export type SummaryVisitInput = {
  accountId: string | null;
  outcomeCode: VisitOutcomeCode | null;
  visitType: string;
  /** Minutes at the clinic (45 or 90); drives `visitSlots`. */
  durationMinutes: number;
  /** True when this account has no earlier VisitRecord by anyone. */
  firstEverVisit: boolean;
};

export type SummaryRunInput = {
  provinceCode: string;
  stopCount: number;
  totalDriveMinutes: number | null;
};

export type DailySummaryValues = {
  provinceCode: string | null;
  plannedStops: number;
  visits: number;
  /** 45-minute slots over the day's visits; a 90-minute visit counts 2. The VISITS metric reads this. */
  visitSlots: number;
  newAccounts: number;
  followUpsDone: number;
  academySignups: number;
  orders: number;
  outcomeCounts: Partial<Record<VisitOutcomeCode, number>>;
  plannedDriveMinutes: number | null;
};

const FOLLOW_UP_TYPES = new Set(["re-visit", "follow-up on a quote", "RE_VISIT", "FOLLOW_UP_ON_A_QUOTE"]);

export function buildDailySummary(input: {
  visits: readonly SummaryVisitInput[];
  runs: readonly SummaryRunInput[];
}): DailySummaryValues {
  const outcomeCounts: Partial<Record<VisitOutcomeCode, number>> = {};
  let visitSlots = 0;
  let newAccounts = 0;
  let followUpsDone = 0;
  let academySignups = 0;
  let orders = 0;

  for (const v of input.visits) {
    if (v.outcomeCode) outcomeCounts[v.outcomeCode] = (outcomeCounts[v.outcomeCode] ?? 0) + 1;
    visitSlots += slotsForDuration(v.durationMinutes);
    if (v.firstEverVisit && v.accountId) newAccounts += 1;
    if (FOLLOW_UP_TYPES.has(v.visitType)) followUpsDone += 1;
    if (v.outcomeCode === "ACADEMY_SIGNUP") academySignups += 1;
    if (v.outcomeCode === "ORDER_PLACED") orders += 1;
  }

  // Latest run of the day wins for province; stops/drive are summed across rebuilds
  // only when they are distinct runs — a rebuild replaces, so we take the last run.
  const lastRun = input.runs.length ? input.runs[input.runs.length - 1] : null;

  return {
    provinceCode: lastRun?.provinceCode ?? null,
    plannedStops: lastRun?.stopCount ?? 0,
    visits: input.visits.length,
    visitSlots,
    newAccounts,
    followUpsDone,
    academySignups,
    orders,
    outcomeCounts,
    plannedDriveMinutes: lastRun?.totalDriveMinutes ?? null,
  };
}

export type MetricSummary = Pick<DailySummaryValues, "visitSlots" | "newAccounts" | "followUpsDone" | "academySignups" | "orders">;

/** Which summary column a target metric reads. VISITS is measured in clinic slots, so a 90-minute visit counts twice. */
export function metricValue(summary: MetricSummary, metric: TargetMetric): number {
  switch (metric) {
    case "VISITS":
      return summary.visitSlots;
    case "NEW_ACCOUNTS":
      return summary.newAccounts;
    case "FOLLOW_UPS":
      return summary.followUpsDone;
    case "ACADEMY_SIGNUPS":
      return summary.academySignups;
    case "ORDERS":
      return summary.orders;
  }
}

/** Sum summaries over a range (used for week / month progress). */
export function sumMetric(summaries: readonly MetricSummary[], metric: TargetMetric): number {
  return summaries.reduce((acc, s) => acc + metricValue(s, metric), 0);
}
