/**
 * Phase 8.8 — Today planner state machine. Pure, so the UX transitions are
 * unit-testable without React or Google.
 */

import type { GeoPoint } from "@/domain/geo";
import type { StartSelection } from "@/lib/placeSelection";
import { validateDrawnArea } from "@/domain/geo/workingArea";
import { drawnAreaInTerritory } from "./province";
import {
  type AreaStrategy,
  effectiveDriveMinutes,
  effectiveRadiusKm,
  travelReachLabel,
} from "./travelReach";

export type PlannerPhase =
  | "no-start"
  | "choose-area"
  | "configure"
  | "building"
  | "route-ready"
  | "route-adjusted"
  | "edit-plan"
  | "stale";

export type PlannerInputs = {
  start: StartSelection | null;
  startText: string;
  textCommitted: boolean;
  provinceCode: string | null;
  provinceError: string | null;
  area: AreaStrategy;
  dayStart: string;
  dayEnd: string;
  target: number;
  minFit: number;
  radiusOverride: number | null;
  driveOverride: number | null;
  alreadyVisited: string;
  revisitsDue: string;
  allowedProvinces: string[];
};

export type PlannerFlags = {
  pending: boolean;
  hasCommittedRoute: boolean;
  editPlanOpen: boolean;
  manuallyAdjusted: boolean;
  committedFingerprint: string | null;
};

export function hasStartLocation(inputs: Pick<PlannerInputs, "start" | "startText" | "textCommitted">): boolean {
  if (inputs.start) return true;
  return inputs.textCommitted && inputs.startText.trim().length >= 2;
}

export function materialFingerprint(inputs: PlannerInputs): string {
  const start = inputs.start
    ? `${inputs.start.lat.toFixed(5)},${inputs.start.lng.toFixed(5)}`
    : `text:${inputs.startText.trim().toUpperCase()}`;
  const area =
    inputs.area.kind === "travel-reach"
      ? `reach:${inputs.area.minutes}`
      : inputs.area.kind === "drawn"
        ? `drawn:${inputs.area.points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";")}`
        : inputs.area.kind === "radius"
          ? `radius:${inputs.area.km}`
          : "none";
  const drive = effectiveDriveMinutes(inputs.area, inputs.driveOverride);
  const radius = inputs.start
    ? effectiveRadiusKm(
        inputs.area,
        { lat: inputs.start.lat, lng: inputs.start.lng },
        inputs.radiusOverride,
      )
    : inputs.radiusOverride;
  return [
    start,
    inputs.provinceCode ?? "",
    area,
    inputs.dayStart,
    inputs.dayEnd,
    inputs.target,
    inputs.minFit,
    drive ?? "",
    radius ?? "",
    inputs.alreadyVisited.trim().toUpperCase(),
    inputs.revisitsDue.trim().toUpperCase(),
  ].join("|");
}

export function areaIsReady(area: AreaStrategy, allowedProvinces: string[] = []): boolean {
  if (area.kind === "travel-reach") return true;
  if (area.kind === "radius") return area.km >= 1;
  if (area.kind === "drawn") {
    if (!validateDrawnArea(area.points).ok) return false;
    return drawnAreaInTerritory(area.points, allowedProvinces).ok;
  }
  return false;
}

export function canBuildDay(inputs: PlannerInputs): boolean {
  if (!hasStartLocation(inputs)) return false;
  if (!inputs.provinceCode || inputs.provinceError) return false;
  if (!areaIsReady(inputs.area, inputs.allowedProvinces)) return false;
  if (inputs.target < 1) return false;
  return true;
}

export function buildBlockedReason(inputs: PlannerInputs): string | null {
  if (!hasStartLocation(inputs)) return "Choose a starting point";
  if (inputs.provinceError) return inputs.provinceError;
  if (!inputs.provinceCode) return "We couldn't determine the province. Choose a start in your territory.";
  if (inputs.area.kind === "none") return "Choose today's area";
  if (inputs.area.kind === "drawn") {
    const v = validateDrawnArea(inputs.area.points);
    if (!v.ok) return v.message;
    const t = drawnAreaInTerritory(inputs.area.points, inputs.allowedProvinces);
    if (!t.ok) return t.message;
  }
  return null;
}

export function derivePhase(inputs: PlannerInputs, flags: PlannerFlags): PlannerPhase {
  if (flags.pending && !flags.hasCommittedRoute) return "building";
  if (!hasStartLocation(inputs)) return "no-start";
  if (inputs.area.kind === "none" || !areaIsReady(inputs.area, inputs.allowedProvinces)) return "choose-area";
  if (!flags.hasCommittedRoute) {
    return flags.pending ? "building" : "configure";
  }
  const current = materialFingerprint(inputs);
  const stale = flags.committedFingerprint != null && current !== flags.committedFingerprint;
  if (flags.editPlanOpen && stale) return "stale";
  if (flags.editPlanOpen) return "edit-plan";
  if (flags.pending) return "building";
  if (flags.manuallyAdjusted) return "route-adjusted";
  return "route-ready";
}

export function startPoint(start: StartSelection | null): GeoPoint | null {
  return start ? { lat: start.lat, lng: start.lng } : null;
}

/**
 * Rebuild must never wipe a successful route on failure.
 * Success replaces; error/idle keep the previous committed result.
 */
export function retainCommittedOnError<T>(
  previous: T | null,
  result: { status: "success"; data: T } | { status: "error"; message: string } | { status: "idle" },
): T | null {
  if (result.status === "success") return result.data;
  return previous;
}

/** Collapsed mobile sheet — planning mode. */
export function collapsedPlanningCopy(opts: {
  hasStart: boolean;
  startLabel: string;
  area: AreaStrategy;
}): { title: string; subtitle: string } {
  return {
    title: opts.hasStart ? opts.startLabel : "Choose your starting point",
    subtitle:
      opts.area.kind === "travel-reach"
        ? travelReachLabel(opts.area.minutes)
        : opts.area.kind === "drawn"
          ? "Today's area drawn"
          : opts.area.kind === "radius"
            ? `Search radius: ${opts.area.km} km`
            : "Choose today's area",
  };
}

/** Collapsed mobile sheet — route mode. */
export function collapsedRouteCopy(opts: {
  seq: number;
  name: string;
  arrivalClock: string | null;
  adjusted: boolean;
}): { kicker: string; title: string; subtitle: string } {
  return {
    kicker: "Next",
    title: `${String(opts.seq).padStart(2, "0")} ${opts.name}`,
    subtitle: opts.adjusted ? "Times recalculate on rebuild" : (opts.arrivalClock ?? ""),
  };
}

/**
 * Session memory is the React state in TodayRoute. Opening a brief or collapsing
 * the planner sheet does not change PlannerInputs, so the fingerprint is stable.
 */
export function sessionMemoryIsPlanningState(keys: string[]): boolean {
  const required = ["start", "area", "dayStart", "dayEnd", "target", "minFit"];
  return required.every((k) => keys.includes(k));
}
