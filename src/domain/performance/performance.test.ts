import { describe, expect, it } from "vitest";
import {
  VISIT_OUTCOMES,
  VISIT_OUTCOME_CODES,
  inferVisitOutcomeCode,
  visitOutcomeLabel,
} from "./visitOutcome";
import {
  periodRange,
  periodDayIndex,
  periodLength,
  resolveActiveTarget,
  resolveDailyVisitsTarget,
  targetProgress,
  dayKey,
  type SalesTargetLike,
} from "./targets";
import { buildDailySummary, metricValue, sumMetric } from "./dailySummary";
import { DAILY_CLINIC_SLOTS, isVisitDuration, slotsForDuration } from "./visitSlots";

describe("visit outcomes", () => {
  it("defines every code exactly once with a label", () => {
    expect(VISIT_OUTCOMES.map((o) => o.code).sort()).toEqual([...VISIT_OUTCOME_CODES].sort());
    for (const o of VISIT_OUTCOMES) expect(o.label.length).toBeGreaterThan(3);
    expect(visitOutcomeLabel("ORDER_PLACED")).toBe("Order placed");
    expect(visitOutcomeLabel("nope")).toBeNull();
  });

  it("infers codes from free text, strongest commitment first", () => {
    expect(inferVisitOutcomeCode("Owner placed an order for Dermaceutic")).toBe("ORDER_PLACED");
    expect(inferVisitOutcomeCode("Interested — follow up next week")).toBe("INTERESTED");
    expect(inferVisitOutcomeCode("Clinic manager was not available, come back Thursday")).toBe("NOT_AVAILABLE");
    expect(inferVisitOutcomeCode("They asked for a quote on Aptos")).toBe("QUOTE_REQUESTED");
    expect(inferVisitOutcomeCode("Not interested at the moment")).toBe("NOT_INTERESTED");
    expect(inferVisitOutcomeCode("Location permanently closed")).toBe("CLOSED_OR_MOVED");
    expect(inferVisitOutcomeCode("ACADEMY_SIGNUP")).toBe("ACADEMY_SIGNUP");
    expect(inferVisitOutcomeCode("")).toBeNull();
    expect(inferVisitOutcomeCode("weather was nice")).toBeNull();
  });
});

describe("target periods", () => {
  it("day range is the day itself", () => {
    expect(periodRange("DAY", "2026-11-04")).toEqual({ start: "2026-11-04", end: "2026-11-04" });
  });

  it("week runs Monday to Sunday", () => {
    // 2026-11-04 is a Wednesday
    expect(periodRange("WEEK", "2026-11-04")).toEqual({ start: "2026-11-02", end: "2026-11-08" });
    // Sunday belongs to the week that started the previous Monday
    expect(periodRange("WEEK", "2026-11-08")).toEqual({ start: "2026-11-02", end: "2026-11-08" });
    expect(periodRange("WEEK", "2026-11-02").start).toBe("2026-11-02");
  });

  it("month range spans the calendar month, including December rollover", () => {
    expect(periodRange("MONTH", "2026-11-15")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(periodRange("MONTH", "2026-12-31")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
    expect(periodRange("MONTH", "2028-02-10").end).toBe("2028-02-29");
    expect(periodLength("MONTH", "2026-11-15")).toBe(30);
    expect(periodDayIndex("MONTH", "2026-11-15")).toBe(15);
  });

  it("dayKey reads UTC calendar date", () => {
    expect(dayKey(new Date("2026-11-01T00:00:00.000Z"))).toBe("2026-11-01");
  });
});

describe("active target resolution", () => {
  const targets: SalesTargetLike[] = [
    { id: "a", period: "DAY", metric: "VISITS", value: 5, startsOn: "2026-01-01", endsOn: null },
    { id: "b", period: "DAY", metric: "VISITS", value: 7, startsOn: "2026-11-01", endsOn: null },
    { id: "c", period: "DAY", metric: "VISITS", value: 9, startsOn: "2026-10-01", endsOn: "2026-10-31" },
    { id: "d", period: "MONTH", metric: "NEW_ACCOUNTS", value: 4, startsOn: "2026-01-01", endsOn: null },
  ];

  it("picks the latest start on or before the day", () => {
    expect(resolveActiveTarget(targets, "DAY", "VISITS", "2026-11-05")?.id).toBe("b");
    expect(resolveActiveTarget(targets, "DAY", "VISITS", "2026-06-05")?.id).toBe("a");
  });

  it("respects endsOn windows", () => {
    expect(resolveActiveTarget(targets, "DAY", "VISITS", "2026-10-15")?.id).toBe("c");
    expect(resolveActiveTarget(targets, "DAY", "VISITS", "2025-12-31")).toBeNull();
  });

  it("filters by period and metric", () => {
    expect(resolveActiveTarget(targets, "MONTH", "VISITS", "2026-11-05")).toBeNull();
    expect(resolveActiveTarget(targets, "MONTH", "NEW_ACCOUNTS", "2026-11-05")?.value).toBe(4);
  });
});

describe("target progress", () => {
  it("reports met, remaining and capped percent", () => {
    const p = targetProgress({ metric: "VISITS", period: "DAY", target: 7, actual: 9, day: "2026-11-04" });
    expect(p.status).toBe("met");
    expect(p.remaining).toBe(0);
    expect(p.percent).toBe(100);
    expect(p.ratio).toBeCloseTo(9 / 7);
  });

  it("paces a monthly target by day index", () => {
    // Day 15 of 30, target 30 → expected 15 by now
    const behind = targetProgress({ metric: "NEW_ACCOUNTS", period: "MONTH", target: 30, actual: 10, day: "2026-11-15" });
    expect(behind.expectedByNow).toBe(15);
    expect(behind.status).toBe("behind");
    expect(behind.forecast).toBe(20);
    expect(behind.dayIndex).toBe(15);
    expect(behind.periodDays).toBe(30);

    const ahead = targetProgress({ metric: "NEW_ACCOUNTS", period: "MONTH", target: 30, actual: 20, day: "2026-11-15" });
    expect(ahead.status).toBe("ahead");
    expect(ahead.forecast).toBe(40);

    const onTrack = targetProgress({ metric: "NEW_ACCOUNTS", period: "MONTH", target: 30, actual: 15, day: "2026-11-15" });
    expect(onTrack.status).toBe("on_track");
  });

  it("handles a zero target without dividing by zero", () => {
    const p = targetProgress({ metric: "ORDERS", period: "DAY", target: 0, actual: 0, day: "2026-11-04" });
    expect(p.percent).toBe(0);
    expect(p.status).not.toBe("met");
  });
});

describe("daily summary", () => {
  it("counts visits, outcomes, new accounts and follow-ups", () => {
    const s = buildDailySummary({
      visits: [
        { accountId: "a1", outcomeCode: "INTERESTED", visitType: "first visit", durationMinutes: 45, firstEverVisit: true },
        { accountId: "a2", outcomeCode: "ORDER_PLACED", visitType: "re-visit", durationMinutes: 90, firstEverVisit: false },
        { accountId: "a3", outcomeCode: "NOT_AVAILABLE", visitType: "first visit", durationMinutes: 45, firstEverVisit: true },
        { accountId: null, outcomeCode: null, visitType: "follow-up on a quote", durationMinutes: 45, firstEverVisit: false },
        { accountId: "a4", outcomeCode: "ACADEMY_SIGNUP", visitType: "first visit", durationMinutes: 45, firstEverVisit: true },
      ],
      runs: [
        { provinceCode: "ON", stopCount: 6, totalDriveMinutes: 90 },
        { provinceCode: "ON", stopCount: 7, totalDriveMinutes: 110 },
      ],
    });
    expect(s.visits).toBe(5);
    expect(s.visitSlots).toBe(6);
    expect(s.newAccounts).toBe(3);
    expect(s.followUpsDone).toBe(2);
    expect(s.academySignups).toBe(1);
    expect(s.orders).toBe(1);
    expect(s.outcomeCounts).toEqual({ INTERESTED: 1, ORDER_PLACED: 1, NOT_AVAILABLE: 1, ACADEMY_SIGNUP: 1 });
    expect(s.plannedStops).toBe(7);
    expect(s.plannedDriveMinutes).toBe(110);
    expect(s.provinceCode).toBe("ON");
  });

  it("empty day yields zeros and nulls", () => {
    const s = buildDailySummary({ visits: [], runs: [] });
    expect(s.visits).toBe(0);
    expect(s.visitSlots).toBe(0);
    expect(s.plannedDriveMinutes).toBeNull();
    expect(s.provinceCode).toBeNull();
  });

  it("metricValue and sumMetric read the matching column", () => {
    const a = buildDailySummary({ visits: [{ accountId: "x", outcomeCode: "ORDER_PLACED", visitType: "first visit", durationMinutes: 90, firstEverVisit: true }], runs: [] });
    const b = buildDailySummary({ visits: [{ accountId: "y", outcomeCode: "ORDER_PLACED", visitType: "first visit", durationMinutes: 45, firstEverVisit: false }], runs: [] });
    expect(metricValue(a, "ORDERS")).toBe(1);
    expect(sumMetric([a, b], "ORDERS")).toBe(2);
    expect(sumMetric([a, b], "NEW_ACCOUNTS")).toBe(1);
    // VISITS is measured in clinic slots: the 90-minute visit counts twice.
    expect(sumMetric([a, b], "VISITS")).toBe(3);
  });
});

describe("clinic slots", () => {
  it("a 45-minute visit is one slot, a 90-minute visit two; the default day is ten", () => {
    expect(slotsForDuration(45)).toBe(1);
    expect(slotsForDuration(90)).toBe(2);
    expect(slotsForDuration(135)).toBe(3);
    expect(slotsForDuration(180)).toBe(4);
    expect(slotsForDuration(null)).toBe(1);
    expect(DAILY_CLINIC_SLOTS).toBe(10);
    expect(isVisitDuration(90)).toBe(true);
    expect(isVisitDuration(180)).toBe(true);
    expect(isVisitDuration(60)).toBe(false);
    expect(isVisitDuration(225)).toBe(false);
  });

  it("the daily clinic target falls back to ten slots and yields to an admin-set one", () => {
    expect(resolveDailyVisitsTarget([], "2026-11-05").value).toBe(10);
    const custom: SalesTargetLike = { id: "t", period: "DAY", metric: "VISITS", value: 8, startsOn: "2026-11-01", endsOn: null };
    expect(resolveDailyVisitsTarget([custom], "2026-11-05").value).toBe(8);
    expect(resolveDailyVisitsTarget([custom], "2026-10-05").value).toBe(10);
  });
});
