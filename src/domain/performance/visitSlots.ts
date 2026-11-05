/**
 * Clinic slots — the unit the daily target is measured in. Pure.
 *
 * A rep's day is ten clinics of 45 minutes. A visit that runs long (90 minutes,
 * e.g. a demo or a training) is recorded as such by the rep and counts as two
 * clinics, so the day stays fair without an admin touching the target.
 */

/** Minutes in one clinic slot. */
export const SLOT_MINUTES = 45;

/** Clinic slots expected per working day when no admin target overrides it. */
export const DAILY_CLINIC_SLOTS = 10;

export const VISIT_DURATIONS = [45, 90] as const;
export type VisitDurationMinutes = (typeof VISIT_DURATIONS)[number];

export const VISIT_DURATION_OPTIONS: readonly { minutes: VisitDurationMinutes; slots: number; label: string; hint: string }[] = [
  { minutes: 45, slots: 1, label: "Standard · 45 min", hint: "Counts as one clinic." },
  { minutes: 90, slots: 2, label: "Extended · 90 min", hint: "Counts as two clinics toward today's target." },
];

export function isVisitDuration(value: unknown): value is VisitDurationMinutes {
  return typeof value === "number" && (VISIT_DURATIONS as readonly number[]).includes(value);
}

/** Slots a visit of `minutes` counts for: 45 → 1, 90 → 2. Anything else rounds to the nearest slot, never below one. */
export function slotsForDuration(minutes: number | null | undefined): number {
  if (!minutes || minutes <= 0) return 1;
  return Math.max(1, Math.round(minutes / SLOT_MINUTES));
}

export function visitDurationLabel(minutes: number): string {
  return VISIT_DURATION_OPTIONS.find((o) => o.minutes === minutes)?.label ?? `${minutes} min`;
}
