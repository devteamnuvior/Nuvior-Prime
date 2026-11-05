/**
 * Rep dashboard copy and streaks (performance phase 3) — pure.
 *
 * The "if you reach it" message is deterministic: it reads today's target
 * progress, the streak and the month pace and picks the most useful sentence.
 * Tone follows brand rules: encouraging, never pushy, never "guaranteed".
 */

import { addDays, parseDayKey, resolveDailyVisitsTarget, TARGET_METRIC_LABELS, type SalesTargetLike, type TargetProgress } from "./targets";

export type StreakInput = { day: string; visitSlots: number };

export type Streak = {
  /** Consecutive working days (Mon–Fri) on which the daily visits target was met, ending yesterday or today. */
  days: number;
  /** True when today is a working day, the target is not met yet and a streak would break. */
  atRisk: boolean;
  /** True when today already counts toward the streak. */
  todayCounted: boolean;
};

function isWeekend(day: string): boolean {
  const d = parseDayKey(day).getUTCDay();
  return d === 0 || d === 6;
}

/**
 * Walk back from today. Weekends neither count nor break. Today counts only
 * once met; an unmet today does not break the streak (the rep still has time).
 * The target is the admin-set DAY/VISITS one or the ten-clinic default.
 */
export function computeStreak(summaries: readonly StreakInput[], targets: readonly SalesTargetLike[], today: string): Streak {
  const byDay = new Map(summaries.map((s) => [s.day, s.visitSlots] as const));
  const met = (day: string): boolean => (byDay.get(day) ?? 0) >= resolveDailyVisitsTarget(targets, day).value;

  let days = 0;
  let todayCounted = false;
  let cursor = today;

  if (!isWeekend(today)) {
    const m = met(today);
    if (m === true) {
      days += 1;
      todayCounted = true;
    }
  }
  cursor = addDays(today, -1);

  for (let i = 0; i < 400; i++) {
    if (isWeekend(cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    const m = met(cursor);
    if (m !== true) break;
    days += 1;
    cursor = addDays(cursor, -1);
  }

  const atRisk = !isWeekend(today) && !todayCounted && days > 0 && met(today) === false;
  return { days, atRisk, todayCounted };
}

export type DayMessage = {
  headline: string;
  detail: string | null;
  tone: "neutral" | "primary" | "success" | "warning";
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function buildDayMessage(input: {
  progress: readonly TargetProgress[];
  streak: Streak;
  overdueFollowUps: number;
  dueTodayFollowUps: number;
  isWorkingDay: boolean;
}): DayMessage {
  const daily = input.progress.find((p) => p.period === "DAY" && p.metric === "VISITS") ?? null;
  const monthly = input.progress.filter((p) => p.period === "MONTH");

  const followUpNote =
    input.overdueFollowUps > 0
      ? `${plural(input.overdueFollowUps, "follow-up")} overdue — worth a call today.`
      : input.dueTodayFollowUps > 0
        ? `${plural(input.dueTodayFollowUps, "follow-up")} due today.`
        : null;

  if (!daily) {
    return {
      headline: "No daily target set yet",
      detail: followUpNote ?? "Ask an admin to set one — progress and streaks start from there.",
      tone: "neutral",
    };
  }

  if (!input.isWorkingDay) {
    return {
      headline: input.streak.days > 0 ? `${plural(input.streak.days, "day")} streak is safe over the weekend` : "Weekend — nothing due today",
      detail: followUpNote,
      tone: "neutral",
    };
  }

  if (daily.status === "met") {
    const extras: string[] = [];
    if (input.streak.days > 1) extras.push(`That makes a ${input.streak.days}-day streak.`);
    else if (input.streak.days === 1) extras.push("Streak started — same again tomorrow keeps it going.");
    return {
      headline: `Today's target reached: ${daily.actual} of ${daily.target} clinics`,
      detail: [...extras, followUpNote].filter(Boolean).join(" ") || null,
      tone: "success",
    };
  }

  const parts: string[] = [];
  if (input.streak.atRisk) parts.push(`keeps your ${input.streak.days}-day streak alive`);
  else if (input.streak.days === 0) parts.push("starts a streak");

  const pace = monthly
    .filter((m) => m.status === "behind" && m.dayIndex >= 3)
    .map((m) => `${TARGET_METRIC_LABELS[m.metric].toLowerCase()} is pacing to ${m.forecast} of ${m.target} this month`)
    .slice(0, 1);

  return {
    headline: `${plural(daily.remaining, "more visit")} to hit today's target`,
    detail: [parts.length ? `Reaching it ${parts.join(" ")}.` : null, pace[0] ? `${pace[0][0].toUpperCase()}${pace[0].slice(1)}.` : null, followUpNote].filter(Boolean).join(" ") || null,
    tone: input.streak.atRisk ? "warning" : "primary",
  };
}

/** Signed percentage change, null when the previous value is zero. */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
