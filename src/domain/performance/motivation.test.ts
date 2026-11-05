import { describe, expect, it } from "vitest";
import { buildDayMessage, computeStreak, deltaPercent } from "./motivation";
import { targetProgress, type SalesTargetLike } from "./targets";

const targets: SalesTargetLike[] = [{ id: "d", period: "DAY", metric: "VISITS", value: 5, startsOn: "2026-01-01", endsOn: null }];

describe("streak", () => {
  // 2026-11-04 is a Wednesday
  it("counts consecutive met weekdays ending yesterday, skipping weekends", () => {
    const s = computeStreak(
      [
        { day: "2026-10-29", visitSlots: 5 }, // Thu
        { day: "2026-10-30", visitSlots: 6 }, // Fri
        { day: "2026-11-02", visitSlots: 5 }, // Mon
        { day: "2026-11-03", visitSlots: 7 }, // Tue
        { day: "2026-11-04", visitSlots: 2 }, // Wed (today, not met yet)
      ],
      targets,
      "2026-11-04",
    );
    expect(s.days).toBe(4);
    expect(s.todayCounted).toBe(false);
    expect(s.atRisk).toBe(true);
  });

  it("counts today once met and breaks on a missed weekday", () => {
    const s = computeStreak(
      [
        { day: "2026-10-30", visitSlots: 1 }, // Fri missed
        { day: "2026-11-02", visitSlots: 5 },
        { day: "2026-11-03", visitSlots: 5 },
        { day: "2026-11-04", visitSlots: 5 },
      ],
      targets,
      "2026-11-04",
    );
    expect(s.days).toBe(3);
    expect(s.todayCounted).toBe(true);
    expect(s.atRisk).toBe(false);
  });

  it("falls back to the ten-slot default without an admin target", () => {
    expect(computeStreak([{ day: "2026-11-03", visitSlots: 9 }], [], "2026-11-04").days).toBe(0);
    expect(computeStreak([{ day: "2026-11-03", visitSlots: 10 }], [], "2026-11-04").days).toBe(1);
  });

  it("weekend today is never at risk", () => {
    const s = computeStreak([{ day: "2026-11-06", visitSlots: 5 }], targets, "2026-11-07"); // Saturday
    expect(s.days).toBe(1);
    expect(s.atRisk).toBe(false);
  });
});

describe("day message", () => {
  const day = "2026-11-04";
  const daily = (actual: number) => targetProgress({ metric: "VISITS", period: "DAY", target: 7, actual, day });
  const quality = (actual: number) => targetProgress({ metric: "QUALITY_VISITS", period: "DAY", target: 4, actual, day });

  it("explains what reaching the target does", () => {
    const m = buildDayMessage({
      progress: [daily(5), quality(3)],
      streak: { days: 6, atRisk: true, todayCounted: false },
      overdueFollowUps: 0,
      dueTodayFollowUps: 0,
      isWorkingDay: true,
    });
    expect(m.headline).toBe("2 more visits to hit today's target");
    expect(m.detail).toContain("keeps your 6-day streak alive");
    expect(m.detail).toContain("1 fit-4+ clinic among them also closes the quality target");
    expect(m.tone).toBe("warning");
  });

  it("celebrates a met target and mentions the streak", () => {
    const m = buildDayMessage({
      progress: [daily(7), quality(4)],
      streak: { days: 3, atRisk: false, todayCounted: true },
      overdueFollowUps: 2,
      dueTodayFollowUps: 0,
      isWorkingDay: true,
    });
    expect(m.headline).toBe("Today's target reached: 7 of 7 clinics");
    expect(m.detail).toContain("3-day streak");
    expect(m.detail).toContain("2 follow-ups overdue");
    expect(m.tone).toBe("success");
  });

  it("mentions month pace when a monthly target is behind", () => {
    const monthly = targetProgress({ metric: "NEW_ACCOUNTS", period: "MONTH", target: 10, actual: 2, day: "2026-11-15" });
    const m = buildDayMessage({ progress: [daily(1), monthly], streak: { days: 0, atRisk: false, todayCounted: false }, overdueFollowUps: 0, dueTodayFollowUps: 1, isWorkingDay: true });
    expect(m.detail).toContain("New accounts visited is pacing to 4 of 10 this month");
    expect(m.detail).toContain("1 follow-up due today");
    expect(m.detail).toContain("starts a streak");
  });

  it("falls back without a daily target and on weekends", () => {
    expect(buildDayMessage({ progress: [], streak: { days: 0, atRisk: false, todayCounted: false }, overdueFollowUps: 0, dueTodayFollowUps: 0, isWorkingDay: true }).headline).toBe("No daily target set yet");
    const w = buildDayMessage({ progress: [daily(0)], streak: { days: 4, atRisk: false, todayCounted: false }, overdueFollowUps: 0, dueTodayFollowUps: 0, isWorkingDay: false });
    expect(w.headline).toContain("4 days streak is safe");
  });
});

describe("deltaPercent", () => {
  it("rounds and guards zero", () => {
    expect(deltaPercent(64, 57)).toBe(12);
    expect(deltaPercent(3, 4)).toBe(-25);
    expect(deltaPercent(5, 0)).toBeNull();
  });
});
