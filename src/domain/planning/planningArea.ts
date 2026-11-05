/**
 * First-class Today's Area — the geographic constraint for candidate discovery.
 *
 * User-facing name: "Today's area". Not GIS terminology.
 *
 *   RADIUS      → km envelope around the start (the default) → maxRadiusKm
 *   DRAWN_AREA  → polygon → workingAreaJson / pointInWorkingArea
 *
 * Drawn-area + due revisits
 * -------------------------
 * Discovery excludes every Place whose coordinates fall outside the polygon
 * (`pointInWorkingArea`) before qualification, CRM overlay, and revisit flags.
 * There is no exception for CRM-due revisits that were never discovered inside
 * the area. A revisit listed in Advanced ("Revisits due today") is still only
 * considered if that account appears in the in-area candidate set.
 *
 * This is intentional and must not be changed silently. Due revisits outside
 * the drawn area are not routed.
 */

import type { GeoPoint } from "@/domain/geo";
import type { AreaStrategy } from "./area";

export type PlanningAreaKind = "drawn" | "radius";

export type PlanningArea = AreaStrategy;

export function planningAreaKind(area: AreaStrategy): PlanningAreaKind | null {
  if (area.kind === "drawn") return "drawn";
  if (area.kind === "radius") return "radius";
  return null;
}

export function drawnArea(points: GeoPoint[]): AreaStrategy {
  return { kind: "drawn", points };
}

export function radiusArea(km: number): AreaStrategy {
  return { kind: "radius", km };
}

export const REVISIT_OUTSIDE_DRAWN_AREA_POLICY =
  "Due revisits outside the drawn area are excluded. The polygon is applied to discovery coordinates before qualification; there is no revisit exception.";
