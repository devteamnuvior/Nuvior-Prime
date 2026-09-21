import type { GeoPoint } from "@/domain/geo";
import { haversineKm } from "@/domain/geo";

/** User-facing Auto Area presets — wired to maxDriveMinutes, not a fake isochrone. */
export const TRAVEL_REACH_PRESETS = [30, 45, 60] as const;
export type TravelReachMinutes = (typeof TRAVEL_REACH_PRESETS)[number];

export type AreaStrategy =
  | { kind: "none" }
  | { kind: "travel-reach"; minutes: TravelReachMinutes }
  | { kind: "drawn"; points: GeoPoint[] }
  | { kind: "radius"; km: number };

/**
 * Geodesic discovery envelope for a travel-reach preset.
 * This is a search radius so Places discovery has a bound — it is NOT a
 * 30/45/60-minute road isochrone and must never be drawn as one.
 */
export function travelReachRadiusKm(minutes: TravelReachMinutes): number {
  if (minutes <= 30) return 40;
  if (minutes <= 45) return 55;
  return 70;
}

export function travelReachLabel(minutes: TravelReachMinutes): string {
  return `Travel reach: ${minutes} min`;
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
  if (polygon.length === 0) return 40;
  let max = 0;
  for (const p of polygon) {
    max = Math.max(max, haversineKm(start, p));
  }
  return Math.min(capKm, Math.max(8, Math.ceil(max + 3)));
}

export function effectiveDriveMinutes(area: AreaStrategy, override: number | null): number | null {
  if (override != null && override > 0) return override;
  if (area.kind === "travel-reach") return area.minutes;
  return null;
}

export function effectiveRadiusKm(
  area: AreaStrategy,
  start: GeoPoint | null,
  override: number | null,
): number {
  if (override != null && override > 0) return override;
  if (area.kind === "radius") return area.km;
  if (area.kind === "travel-reach") return travelReachRadiusKm(area.minutes);
  if (area.kind === "drawn" && start) return radiusKmForDrawnArea(start, area.points);
  return 40;
}
