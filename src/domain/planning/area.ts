/**
 * Today's area — where discovery looks for the day's ten clinics.
 *
 * The rep only shares a start; the day is the nearest qualified clinics within
 * a search radius around it. They can tighten that by drawing an outline on
 * the map, or change the radius under Edit plan. There is no drive-time
 * preset, no day hours and no clinic count to choose: every day is
 * DAILY_CLINIC_SLOTS clinics.
 */

import type { GeoPoint } from "@/domain/geo";
import { haversineKm } from "@/domain/geo";

/** Geodesic search envelope around the start when nothing else is chosen. */
export const DEFAULT_SEARCH_RADIUS_KM = 40;

export type AreaStrategy =
  | { kind: "none" }
  | { kind: "drawn"; points: GeoPoint[] }
  | { kind: "radius"; km: number };

export function defaultArea(): AreaStrategy {
  return { kind: "radius", km: DEFAULT_SEARCH_RADIUS_KM };
}

/**
 * Discovery radius for a drawn area: farthest vertex from start, plus a
 * small buffer, capped. Keeps Places search covering the polygon without
 * changing discovery rules.
 */
export function radiusKmForDrawnArea(
  start: GeoPoint,
  polygon: GeoPoint[],
  capKm = 200,
): number {
  if (polygon.length === 0) return DEFAULT_SEARCH_RADIUS_KM;
  let max = 0;
  for (const p of polygon) {
    max = Math.max(max, haversineKm(start, p));
  }
  return Math.min(capKm, Math.max(8, Math.ceil(max + 3)));
}

/** The radius submitted as `maxRadiusKm` for the chosen area. */
export function effectiveRadiusKm(area: AreaStrategy, start: GeoPoint | null): number {
  if (area.kind === "radius") return area.km;
  if (area.kind === "drawn" && start) return radiusKmForDrawnArea(start, area.points);
  return DEFAULT_SEARCH_RADIUS_KM;
}

/** Collapsed-sheet subtitle for the chosen area. */
export function areaLabel(area: AreaStrategy): string {
  if (area.kind === "drawn") return "Today's area drawn";
  if (area.kind === "radius") return `Within ${area.km} km of your start`;
  return "Choose today's area";
}
