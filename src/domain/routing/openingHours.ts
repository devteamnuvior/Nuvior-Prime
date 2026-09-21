/**
 * Opening-hours feasibility + suggested drop-in window (deterministic).
 * Never invents hours — missing → UNKNOWN, verify.
 */

import { minutesToClock, type RoutingConfig } from "./config";

export type OpeningHoursState =
  | "open"
  | "closed"
  | "unknown"
  | "opens_later"
  | "closes_early";

export type DayPeriod = { openMinutes: number; closeMinutes: number };

export type OpeningHoursAssessment = {
  state: OpeningHoursState;
  label: string;
  periodsToday: DayPeriod[];
  suggestedDropInWindow: string | null;
};

/** JS Date.getDay(): 0=Sun … 6=Sat — Google Places often uses the same. */
export function assessOpeningHours(
  openingHoursJson: unknown | null | undefined,
  onDate: Date,
  cfg: Pick<
    RoutingConfig,
    "avoidAfterOpenMinutes" | "avoidBeforeCloseMinutes" | "lunchEnabled" | "lunchStartMinutes" | "lunchEndMinutes"
  >,
  plannedArrivalMinutes?: number | null,
): OpeningHoursAssessment {
  const periods = extractPeriodsForDay(openingHoursJson, onDate.getDay());
  if (periods === null) {
    return {
      state: "unknown",
      label: "UNKNOWN, verify",
      periodsToday: [],
      suggestedDropInWindow: null,
    };
  }
  if (periods.length === 0) {
    return {
      state: "closed",
      label: "Closed today",
      periodsToday: [],
      suggestedDropInWindow: null,
    };
  }

  const suggestion = suggestDropIn(periods, cfg);

  if (plannedArrivalMinutes != null) {
    const openAtArrival = periods.some(
      (p) => plannedArrivalMinutes >= p.openMinutes && plannedArrivalMinutes < p.closeMinutes,
    );
    if (!openAtArrival) {
      const opensLater = periods.some((p) => plannedArrivalMinutes < p.openMinutes);
      return {
        state: opensLater ? "opens_later" : "closed",
        label: opensLater ? "Opens after planned arrival" : "Closed at planned arrival",
        periodsToday: periods,
        suggestedDropInWindow: suggestion,
      };
    }
    const nearClose = periods.some(
      (p) =>
        plannedArrivalMinutes >= p.openMinutes &&
        plannedArrivalMinutes < p.closeMinutes &&
        p.closeMinutes - plannedArrivalMinutes <= cfg.avoidBeforeCloseMinutes,
    );
    if (nearClose) {
      return {
        state: "closes_early",
        label: "Arrives near closing — verify",
        periodsToday: periods,
        suggestedDropInWindow: suggestion,
      };
    }
  }

  return {
    state: "open",
    label: "Open during planning window",
    periodsToday: periods,
    suggestedDropInWindow: suggestion,
  };
}

export function suggestDropIn(
  periods: DayPeriod[],
  cfg: Pick<
    RoutingConfig,
    "avoidAfterOpenMinutes" | "avoidBeforeCloseMinutes" | "lunchEnabled" | "lunchStartMinutes" | "lunchEndMinutes"
  >,
): string | null {
  if (!periods.length) return null;
  const p = periods[0]!;
  let start = p.openMinutes + cfg.avoidAfterOpenMinutes;
  let end = p.closeMinutes - cfg.avoidBeforeCloseMinutes;
  if (end <= start) {
    start = p.openMinutes;
    end = p.closeMinutes;
  }

  // Prefer window outside lunch when possible
  if (cfg.lunchEnabled) {
    if (start < cfg.lunchStartMinutes && end > cfg.lunchStartMinutes) {
      const beforeLunchEnd = Math.min(end, cfg.lunchStartMinutes);
      if (beforeLunchEnd - start >= 30) {
        return `Suggested drop-in window ${minutesToClock(start)}–${minutesToClock(beforeLunchEnd)} (not an appointment)`;
      }
    }
    if (start < cfg.lunchEndMinutes && end > cfg.lunchEndMinutes) {
      start = Math.max(start, cfg.lunchEndMinutes);
    }
  }

  if (end <= start) return `Suggested drop-in window — verify hours on site`;
  return `Suggested drop-in window ${minutesToClock(start)}–${minutesToClock(end)} (not an appointment)`;
}

/**
 * Returns null if hours unknown; empty array if closed that day; else periods.
 */
export function extractPeriodsForDay(
  openingHoursJson: unknown | null | undefined,
  day: number,
): DayPeriod[] | null {
  if (openingHoursJson == null) return null;
  if (typeof openingHoursJson !== "object") return null;

  const obj = openingHoursJson as Record<string, unknown>;

  // Places New: periods: [{ open: { day, hour, minute }, close: { ... } }]
  const periodsRaw = (obj.periods ?? obj.weekdayDescriptions) as unknown;
  if (Array.isArray(obj.periods)) {
    const out: DayPeriod[] = [];
    for (const raw of obj.periods as Record<string, unknown>[]) {
      const open = raw.open as Record<string, number> | undefined;
      const close = raw.close as Record<string, number> | undefined;
      if (!open || open.day !== day) continue;
      const openMinutes = (open.hour ?? 0) * 60 + (open.minute ?? 0);
      let closeMinutes = close
        ? (close.hour ?? 0) * 60 + (close.minute ?? 0)
        : openMinutes + 8 * 60;
      if (close && close.day !== day && close.day != null) {
        closeMinutes = 24 * 60; // crosses midnight — treat as end of day for planning
      }
      out.push({ openMinutes, closeMinutes });
    }
    return out;
  }

  // Fixture helper: { byDay: { "1": [{open:"09:00",close:"17:00"}] } }
  if (obj.byDay && typeof obj.byDay === "object") {
    const dayKey = String(day);
    const list = (obj.byDay as Record<string, unknown>)[dayKey];
    if (!list) return [];
    if (!Array.isArray(list)) return null;
    return list.map((item) => {
      const r = item as { open?: string; close?: string };
      return {
        openMinutes: parseClock(r.open ?? "09:00"),
        closeMinutes: parseClock(r.close ?? "17:00"),
      };
    });
  }

  if (Array.isArray(periodsRaw) && typeof periodsRaw[0] === "string") {
    // weekdayDescriptions only — cannot reliably parse → unknown
    return null;
  }

  return null;
}

function parseClock(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return 9 * 60;
  return Number(m[1]) * 60 + Number(m[2]);
}
