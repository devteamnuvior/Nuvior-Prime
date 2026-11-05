import { describe, expect, it } from "vitest";
import { aggregateTeamTargets, TEAM_TARGET_PERIODS } from "./teamTargets";
import { targetProgress } from "./targets";

const day = "2026-11-05"; // a Thursday: day 4 of the week, day 5 of the month

describe("team target aggregation", () => {
  it("sums target and actual per period and metric and counts rep statuses", () => {
    const byRep = {
      a: [targetProgress({ period: "DAY", metric: "VISITS", target: 10, actual: 10, day })],
      b: [targetProgress({ period: "DAY", metric: "VISITS", target: 10, actual: 4, day })],
      c: [targetProgress({ period: "DAY", metric: "VISITS", target: 8, actual: 9, day })],
    };
    const [visits] = aggregateTeamTargets(byRep, day);
    expect(visits.key).toBe("DAY-VISITS");
    expect(visits.progress.target).toBe(28);
    expect(visits.progress.actual).toBe(23);
    expect(visits.progress.remaining).toBe(5);
    expect(visits.reps).toBe(3);
    expect(visits.repsMet).toBe(2);
    expect(visits.repsOnPace).toBe(2);
    expect(visits.progress.status).toBe("behind");
  });

  it("orders day, week, month and keeps metrics in catalogue order", () => {
    const byRep = {
      a: [
        targetProgress({ period: "MONTH", metric: "ACADEMY_SIGNUPS", target: 2, actual: 0, day }),
        targetProgress({ period: "WEEK", metric: "FOLLOW_UPS", target: 5, actual: 1, day }),
        targetProgress({ period: "MONTH", metric: "NEW_ACCOUNTS", target: 4, actual: 1, day }),
        targetProgress({ period: "DAY", metric: "VISITS", target: 10, actual: 3, day }),
      ],
    };
    expect(aggregateTeamTargets(byRep, day).map((s) => s.key)).toEqual(["DAY-VISITS", "WEEK-FOLLOW_UPS", "MONTH-NEW_ACCOUNTS", "MONTH-ACADEMY_SIGNUPS"]);
  });

  it("only counts a target for the reps who hold it", () => {
    const byRep = {
      a: [targetProgress({ period: "DAY", metric: "VISITS", target: 10, actual: 2, day }), targetProgress({ period: "WEEK", metric: "FOLLOW_UPS", target: 5, actual: 5, day })],
      b: [targetProgress({ period: "DAY", metric: "VISITS", target: 10, actual: 2, day })],
    };
    const stats = aggregateTeamTargets(byRep, day);
    expect(stats.find((s) => s.key === "WEEK-FOLLOW_UPS")).toMatchObject({ reps: 1, repsMet: 1, progress: { target: 5, actual: 5, status: "met" } });
    expect(stats.find((s) => s.key === "DAY-VISITS")).toMatchObject({ reps: 2 });
  });

  it("is empty with no reps", () => {
    expect(aggregateTeamTargets({}, day)).toEqual([]);
    expect(TEAM_TARGET_PERIODS).toEqual(["DAY", "WEEK", "MONTH"]);
  });
});
