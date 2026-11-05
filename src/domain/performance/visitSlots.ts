/**
 * Clinic slots — the unit the daily target is measured in. Pure.
 *
 * A rep's day is ten clinics of 45 minutes. A visit that runs long is recorded
 * in 45-minute slots by the rep (90 minutes = two clinics, 135 = three, 180 =
 * four), so a demo or a training counts toward the ten without an admin
 * touching the target.
 */

/** Minutes in one clinic slot. */
export const SLOT_MINUTES = 45;

/** Clinic slots expected per working day when no admin target overrides it. */
export const DAILY_CLINIC_SLOTS = 10;

export const VISIT_DURATIONS = [45, 90, 135, 180] as const;
export type VisitDurationMinutes = (typeof VISIT_DURATIONS)[number];

const SLOT_WORDS = ["one", "two", "three", "four"] as const;

export const VISIT_DURATION_OPTIONS: readonly { minutes: VisitDurationMinutes; slots: number; label: string; hint: string }[] = VISIT_DURATIONS.map(
  (minutes, i) => ({
    minutes,
    slots: i + 1,
    label: i === 0 ? "Standard · 45 min" : `${minutes} min · ${i + 1} slots`,
    hint: i === 0 ? "Counts as one clinic." : `Counts as ${SLOT_WORDS[i]} clinics toward today's ${DAILY_CLINIC_SLOTS}.`,
  }),
);

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
