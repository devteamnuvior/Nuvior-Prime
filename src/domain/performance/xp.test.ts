import { describe, expect, it } from "vitest";
import {
  BADGES,
  earnedBadges,
  leaderboardView,
  levelFor,
  nextBadges,
  pointsForVisit,
  POINT_REASONS,
  POINT_RULES,
  rankEntries,
  type BadgeStats,
  type LeaderboardEntry,
  type VisitPointInput,
} from "./xp";

const base: VisitPointInput = {
  id: "v1",
  day: "2026-11-03",
  createdDay: "2026-11-03",
  accountId: "a1",
  outcomeCode: "INTERESTED",
  fitScoreSnapshot: 5,
  firstVisitToAccountToday: true,
  earlierOrderOnAccount: false,
  pendingFollowUpDueOn: null,
};

describe("points for a visit", () => {
  it("rewards quality over volume and logs outcome same day", () => {
    const awards = pointsForVisit(base);
    expect(awards.map((a) => a.reason)).toEqual(["QUALITY_VISIT", "OUTCOME_SAME_DAY"]);
    expect(awards.reduce((s, a) => s + a.basePoints, 0)).toBe(25);
    const low = pointsForVisit({ ...base, fitScoreSnapshot: 2, createdDay: "2026-11-05" });
    expect(low.map((a) => a.reason)).toEqual(["VISIT"]);
  });

  it("gives nothing for a second visit to the same account on the same day", () => {
    expect(pointsForVisit({ ...base, firstVisitToAccountToday: false })).toEqual([]);
    expect(pointsForVisit({ ...base, accountId: null })).toEqual([]);
  });

  it("awards follow-up on time only when on or before the due date", () => {
    expect(pointsForVisit({ ...base, pendingFollowUpDueOn: "2026-11-03" }).map((a) => a.reason)).toContain("FOLLOW_UP_ON_TIME");
    expect(pointsForVisit({ ...base, pendingFollowUpDueOn: "2026-11-02" }).map((a) => a.reason)).not.toContain("FOLLOW_UP_ON_TIME");
  });

  it("awards strategic outcomes: academy and first order only once per account", () => {
    expect(pointsForVisit({ ...base, outcomeCode: "ACADEMY_SIGNUP" }).map((a) => a.reason)).toContain("ACADEMY_SIGNUP");
    expect(pointsForVisit({ ...base, outcomeCode: "ORDER_PLACED" }).map((a) => a.reason)).toContain("FIRST_ORDER");
    expect(pointsForVisit({ ...base, outcomeCode: "ORDER_PLACED", earlierOrderOnAccount: true }).map((a) => a.reason)).not.toContain("FIRST_ORDER");
  });

  it("every reason has a rule", () => {
    for (const r of POINT_REASONS) expect(POINT_RULES[r].points).toBeGreaterThan(0);
  });
});

describe("levels", () => {
  it("maps XP to levels with progress to the next", () => {
    expect(levelFor(0)).toMatchObject({ name: "Associate", next: 500, toNext: 500, progress: 0 });
    expect(levelFor(1180)).toMatchObject({ name: "Specialist", next: 1500, toNext: 320, progress: 68 });
    expect(levelFor(9000)).toMatchObject({ name: "Master", next: null, toNext: null, progress: 100 });
    expect(levelFor(-5).name).toBe("Associate");
  });
});

describe("badges", () => {
  const stats: BadgeStats = { visits: 75, qualityVisits: 60, academySignups: 3, firstOrders: 1, followUpsOnTime: 4, daysTargetMet: 2, longestStreak: 3, totalXp: 900 };
  it("earns thresholds and ranks next badges by progress", () => {
    expect(earnedBadges(stats).map((b) => b.code)).toEqual(["FIRST_STEPS", "QUALITY_FOCUS", "OPENER"]);
    const next = nextBadges(stats, 2);
    expect(next[0].code).toBe("CENTURY");
    expect(next[0].percent).toBe(75);
    // STREAK_5 and ACADEMY_BUILDER both sit at 3/5; catalog order breaks the tie.
    expect(next[1].code).toBe("STREAK_5");
    expect(next[1].percent).toBe(60);
  });
  it("badge codes are unique", () => {
    expect(new Set(BADGES.map((b) => b.code)).size).toBe(BADGES.length);
  });
});

describe("leaderboard", () => {
  const entries: LeaderboardEntry[] = [
    { userId: "a", displayName: "A", provinceCode: "ON", points: 300, visits: 20, qualityVisits: 10, totalXp: 1000 },
    { userId: "b", displayName: "B", provinceCode: "ON", points: 300, visits: 18, qualityVisits: 10, totalXp: 900 },
    { userId: "c", displayName: "C", provinceCode: "ON", points: 250, visits: 25, qualityVisits: 5, totalXp: 800 },
    { userId: "d", displayName: "D", provinceCode: "ON", points: 100, visits: 9, qualityVisits: 2, totalXp: 100 },
    { userId: "e", displayName: "E", provinceCode: "ON", points: 90, visits: 9, qualityVisits: 2, totalXp: 100 },
    { userId: "f", displayName: "F", provinceCode: "ON", points: 10, visits: 1, qualityVisits: 0, totalXp: 10 },
    { userId: "g", displayName: "G", provinceCode: "ON", points: 0, visits: 0, qualityVisits: 0, totalXp: 0 },
  ];
  it("ranks with shared ties", () => {
    const r = rankEntries(entries);
    expect(r.map((x) => [x.userId, x.rank])).toEqual([["a", 1], ["b", 1], ["c", 3], ["d", 4], ["e", 5], ["f", 6], ["g", 7]]);
  });
  it("trims to top 3 plus a window for reps and reports distance to first", () => {
    const r = rankEntries(entries);
    const v = leaderboardView(r, "e", false, 1);
    expect(v.rows.map((x) => x.userId)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(v.trimmed).toBe(true);
    expect(v.toFirst).toBe(210);
    const full = leaderboardView(r, "e", true);
    expect(full.rows).toHaveLength(7);
    expect(full.trimmed).toBe(false);
    expect(leaderboardView(r, "a", false).toFirst).toBe(0);
  });
});
