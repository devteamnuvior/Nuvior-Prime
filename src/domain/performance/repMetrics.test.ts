import { describe, expect, it } from "vitest";
import {
  activityCalendar,
  computeRepKpis,
  funnel,
  outcomeBreakdown,
  productMix,
  qualityStats,
  rangeFor,
  weeklySeries,
  type DailySummaryRow,
  type VisitRowInput,
} from "./repMetrics";
import type { SalesTargetLike } from "./targets";

function day(partial: Partial<DailySummaryRow> & { day: string }): DailySummaryRow {
  return {
    plannedStops: 0,
    visits: 0,
    visitSlots: partial.visits ?? 0,
    qualityVisits: 0,
    newAccounts: 0,
    followUpsDone: 0,
    academySignups: 0,
    orders: 0,
    plannedDriveMinutes: null,
    avgFitScore: null,
    outcomeCounts: null,
    ...partial,
  };
}

const targets: SalesTargetLike[] = [{ id: "t", period: "DAY", metric: "VISITS", value: 5, startsOn: "2026-01-01", endsOn: null }];

describe("rep KPIs", () => {
  it("computes hit rate, adherence, conversion and drive per visit", () => {
    const k = computeRepKpis(
      [
        day({ day: "2026-11-02", plannedStops: 8, visits: 6, plannedDriveMinutes: 120, outcomeCounts: { INTERESTED: 3, ORDER_PLACED: 1, NOT_AVAILABLE: 2 } }),
        day({ day: "2026-11-03", plannedStops: 6, visits: 4, plannedDriveMinutes: 80, outcomeCounts: { MET_DECISION_MAKER: 4 }, orders: 0 }),
        day({ day: "2026-11-04" }), // inactive day is ignored
      ],
      targets,
    );
    // Day 1 met (6 >= 5), day 2 missed (4 < 5)
    expect(k.targetHitRate).toBe(50);
    expect(k.planAdherence).toBe(Math.round((10 / 14) * 100));
    // contact-made visits: 3 + 1 + 4 = 8 (NOT_AVAILABLE excluded); orders counted from summary totals
    expect(k.totals.visits).toBe(10);
    expect(k.totals.activeDays).toBe(2);
    expect(k.driveMinutesPerVisit).toBe(20);
    expect(k.visitToOrder).toBe(0);
  });

  it("returns nulls without activity and scores the default ten-slot target without admin targets", () => {
    const k = computeRepKpis([day({ day: "2026-11-02", visits: 3, plannedStops: 0, orders: 1, outcomeCounts: { ORDER_PLACED: 1, INTERESTED: 2 } })], []);
    // No admin target: the ten-clinic default applies, and 3 slots miss it.
    expect(k.targetHitRate).toBe(0);
    expect(k.planAdherence).toBeNull();
    expect(k.visitToOrder).toBe(33);
    // No planned driving recorded → unknown, not zero
    expect(k.driveMinutesPerVisit).toBeNull();
    expect(computeRepKpis([], targets).driveMinutesPerVisit).toBeNull();
  });
});

describe("weekly series", () => {
  it("buckets Monday-based weeks and derives a weekly target from the daily one", () => {
    const pts = weeklySeries(
      [day({ day: "2026-11-03", visits: 4, qualityVisits: 2 }), day({ day: "2026-11-09", visits: 7 })],
      targets,
      "2026-11-01",
      "2026-11-14",
    );
    // 2026-11-01 is a Sunday → first week starts Mon 2026-10-26
    expect(pts.map((p) => p.weekStart)).toEqual(["2026-10-26", "2026-11-02", "2026-11-09"]);
    expect(pts[1].visits).toBe(4);
    expect(pts[1].qualityVisits).toBe(2);
    expect(pts[2].visits).toBe(7);
    expect(pts[0].target).toBe(25);
    expect(pts[0].label).toBe("Oct 26");
  });

  it("prefers an explicit weekly target", () => {
    const pts = weeklySeries([], [...targets, { id: "w", period: "WEEK", metric: "VISITS", value: 30, startsOn: "2026-01-01", endsOn: null }], "2026-11-02", "2026-11-08");
    expect(pts).toHaveLength(1);
    expect(pts[0].target).toBe(30);
  });
});

const visits: VisitRowInput[] = [
  { id: "1", accountId: "a", day: "2026-11-02", outcomeCode: "INTERESTED", fitScoreSnapshot: 5, followUpDate: "2026-11-05" },
  { id: "2", accountId: "b", day: "2026-11-02", outcomeCode: "NOT_AVAILABLE", fitScoreSnapshot: 3, followUpDate: null },
  { id: "3", accountId: "c", day: "2026-11-03", outcomeCode: "ORDER_PLACED", fitScoreSnapshot: 4, followUpDate: null },
  { id: "4", accountId: "a", day: "2026-11-06", outcomeCode: "QUOTE_REQUESTED", fitScoreSnapshot: 5, followUpDate: "2026-11-20" },
  { id: "5", accountId: "d", day: "2026-11-03", outcomeCode: null, fitScoreSnapshot: null, followUpDate: "2026-11-04" },
];

describe("funnel and breakdowns", () => {
  it("funnel steps narrow from planned stops to orders", () => {
    const f = funnel([day({ day: "2026-11-02", plannedStops: 9 }), day({ day: "2026-11-03", plannedStops: 7 })], visits);
    expect(f.map((s) => s.value)).toEqual([16, 5, 3, 3, 1]);
  });

  it("outcome breakdown sorts by count and carries labels", () => {
    const b = outcomeBreakdown(visits);
    expect(b[0].count).toBe(1);
    expect(b.map((s) => s.code)).toContain("ORDER_PLACED");
    expect(b.find((s) => s.code === "INTERESTED")?.label).toBe("Interested, follow-up agreed");
  });

  it("product mix percentages sum to about 100", () => {
    const m = productMix([{ leadProduct: "DERMACEUTIC", fitScore: 4 }, { leadProduct: "DERMACEUTIC", fitScore: 5 }, { leadProduct: "APTOS", fitScore: 3 }]);
    expect(m[0]).toEqual({ product: "DERMACEUTIC", count: 2, percent: 67 });
    expect(m[1].percent).toBe(33);
  });
});

describe("quality and calendar", () => {
  it("counts overdue follow-ups only when no later visit covers the account", () => {
    const q = qualityStats(visits, "2026-11-10");
    // visit 1 (a, due 11-05) is covered by visit 4 on 11-06; visit 5 (d, due 11-04) is not
    expect(q.overdueFollowUps).toBe(1);
    expect(q.avgFitScore).toBe(4.3);
    expect(q.outcomeCoverage).toBe(80);
    expect(q.qualityShare).toBe(60);
  });

  it("calendar fills every day in range", () => {
    const c = activityCalendar([day({ day: "2026-11-02", visits: 3, qualityVisits: 1 })], "2026-11-01", "2026-11-03");
    expect(c.map((x) => x.visits)).toEqual([0, 3, 0]);
    expect(c[1].qualityVisits).toBe(1);
  });

  it("rangeFor spans the requested number of days ending today", () => {
    const r = rangeFor("30", new Date("2026-11-01T15:00:00.000Z"));
    expect(r).toEqual({ start: "2026-10-03", end: "2026-11-01", days: 30 });
  });
});
