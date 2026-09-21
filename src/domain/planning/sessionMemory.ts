/**
 * In-tab persistence for Today's planning inputs (and optional last route).
 * sessionStorage only — not a cross-device preset system.
 */

import type { StartSelection } from "@/lib/placeSelection";
import type { AreaStrategy } from "./travelReach";

export const PLANNER_SESSION_KEY = "nuvior.today.planner.v1";

export type PlannerSessionSnapshot = {
  start: StartSelection | null;
  startText: string;
  textCommitted: boolean;
  area: AreaStrategy;
  dayStart: string;
  dayEnd: string;
  target: number;
  minFit: number;
  radiusOverride: number | null;
  driveOverride: number | null;
  alreadyVisited: string;
  revisitsDue: string;
  province: string;
};

export function serializePlannerSession(s: PlannerSessionSnapshot): string {
  return JSON.stringify(s);
}

export function parsePlannerSession(raw: string): PlannerSessionSnapshot | null {
  try {
    const v = JSON.parse(raw) as PlannerSessionSnapshot;
    if (!v || typeof v !== "object") return null;
    if (typeof v.startText !== "string") return null;
    if (!v.area || typeof v.area.kind !== "string") return null;
    return v;
  } catch {
    return null;
  }
}

export function loadPlannerSession(): PlannerSessionSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PLANNER_SESSION_KEY);
    return raw ? parsePlannerSession(raw) : null;
  } catch {
    return null;
  }
}

export function savePlannerSession(s: PlannerSessionSnapshot): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PLANNER_SESSION_KEY, serializePlannerSession(s));
  } catch {
    /* quota / private mode */
  }
}

export function clearPlannerSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(PLANNER_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
