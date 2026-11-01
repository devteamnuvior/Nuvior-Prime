import type { ChallengeLike } from "@/domain/performance/xp";

const dayFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });

function utc(day: string): number {
  return new Date(`${day}T00:00:00.000Z`).getTime();
}

/** "Nov 1 – Nov 30" */
export function formatDayRange(startsOn: string, endsOn: string): string {
  return `${dayFmt.format(new Date(utc(startsOn)))} – ${dayFmt.format(new Date(utc(endsOn)))}`;
}

/** Inclusive length of the window in days (0 when the dates are not both valid). */
export function windowDays(startsOn: string, endsOn: string): number {
  const a = utc(startsOn);
  const b = utc(endsOn);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Days from today to the end of the window, inclusive of today; 0 once it has ended. */
export function daysLeft(c: Pick<ChallengeLike, "endsOn">, today: string): number {
  return Math.max(0, windowDays(today, c.endsOn));
}

/** Fraction of the window that has elapsed as of today, clamped to 0–1. */
export function elapsedFraction(c: Pick<ChallengeLike, "startsOn" | "endsOn">, today: string): number {
  const total = windowDays(c.startsOn, c.endsOn);
  if (total === 0) return 0;
  const done = windowDays(c.startsOn, today) - 1;
  return Math.min(1, Math.max(0, done / total));
}
