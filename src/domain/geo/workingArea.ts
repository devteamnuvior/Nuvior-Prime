import type { GeoPoint } from "@/domain/geo";

/**
 * Working area — a rep-drawn polygon that constrains today's planning.
 * Canonical representation is an ordered array of lat/lng vertices
 * (implicitly closed; first point is NOT repeated at the end).
 *
 * This is a planning constraint, not decoration: discovery candidates outside
 * the polygon are excluded before qualification (see runProspectSearch).
 */

export const MIN_WORKING_AREA_POINTS = 3;
export const MAX_WORKING_AREA_POINTS = 100;
/** Accidental 3-click specks — ~140 m square. */
export const MIN_WORKING_AREA_KM2 = 0.02;

export type DrawnAreaValidation =
  | { ok: true }
  | { ok: false; message: string };

export function validateDrawnArea(points: GeoPoint[]): DrawnAreaValidation {
  if (points.length < MIN_WORKING_AREA_POINTS) {
    return { ok: false, message: "Today's area needs at least 3 points. Keep tapping, or use travel reach instead." };
  }
  if (points.length > MAX_WORKING_AREA_POINTS) {
    return { ok: false, message: `Today's area is too detailed (${MAX_WORKING_AREA_POINTS} points max). Clear and draw a simpler outline.` };
  }
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) {
      return { ok: false, message: "Today's area contains an invalid point. Clear and redraw." };
    }
  }
  if (polygonSelfIntersects(points)) {
    return { ok: false, message: "Today's area crosses itself. Redraw so the outline doesn't overlap." };
  }
  if (polygonAreaKm2(points) < MIN_WORKING_AREA_KM2) {
    return { ok: false, message: "Today's area is too small. Expand the outline, or use travel reach instead." };
  }
  return { ok: true };
}

/** True when non-adjacent edges cross (adjacent edges share a vertex and are allowed). */
export function polygonSelfIntersects(polygon: GeoPoint[]): boolean {
  const n = polygon.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = polygon[i]!;
    const a2 = polygon[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      const b1 = polygon[j]!;
      const b2 = polygon[(j + 1) % n]!;
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function segmentsIntersect(p1: GeoPoint, p2: GeoPoint, p3: GeoPoint, p4: GeoPoint): boolean {
  const d = (p2.lng - p1.lng) * (p4.lat - p3.lat) - (p2.lat - p1.lat) * (p4.lng - p3.lng);
  if (Math.abs(d) < 1e-18) return false;
  const t = ((p3.lng - p1.lng) * (p4.lat - p3.lat) - (p3.lat - p1.lat) * (p4.lng - p3.lng)) / d;
  const u = ((p3.lng - p1.lng) * (p2.lat - p1.lat) - (p3.lat - p1.lat) * (p2.lng - p1.lng)) / d;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
}

export function serializeWorkingArea(points: GeoPoint[]): string {
  return JSON.stringify(points.map((p) => ({ lat: round6(p.lat), lng: round6(p.lng) })));
}

/**
 * Parse and validate a polygon payload from the client.
 * Returns null for empty input; throws for present-but-invalid input so the
 * caller can surface a clear error instead of silently ignoring the area.
 */
export function parseWorkingArea(json: string | null | undefined): GeoPoint[] | null {
  if (!json || json.trim() === "" || json.trim() === "[]") return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("Working area is not valid JSON");
  }
  if (!Array.isArray(raw)) throw new Error("Working area must be an array of points");
  if (raw.length < MIN_WORKING_AREA_POINTS)
    throw new Error(`Working area needs at least ${MIN_WORKING_AREA_POINTS} points`);
  if (raw.length > MAX_WORKING_AREA_POINTS)
    throw new Error(`Working area exceeds ${MAX_WORKING_AREA_POINTS} points`);
  const points: GeoPoint[] = [];
  for (const item of raw) {
    const p = item as { lat?: unknown; lng?: unknown };
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new Error("Working area contains an invalid coordinate");
    }
    points.push({ lat, lng });
  }
  const check = validateDrawnArea(points);
  if (!check.ok) throw new Error(check.message);
  return points;
}

/**
 * Ray-casting point-in-polygon. Adequate at territory scale; treats the
 * polygon as planar, which is fine for city/region-sized areas.
 */
export function pointInWorkingArea(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < MIN_WORKING_AREA_POINTS) return true;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const intersects =
      a.lng > point.lng !== b.lng > point.lng &&
      point.lat < ((b.lat - a.lat) * (point.lng - a.lng)) / (b.lng - a.lng) + a.lat;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Approximate polygon area in km² (shoelace on an equirectangular projection
 * centred on the polygon). Display-only — used to show the size of a drawn
 * working area while drawing. Adequate at territory scale.
 */
export function polygonAreaKm2(polygon: GeoPoint[]): number {
  if (polygon.length < 3) return 0;
  const R = 6371; // km
  const rad = Math.PI / 180;
  const midLat = polygon.reduce((acc, p) => acc + p.lat, 0) / polygon.length;
  const cos = Math.cos(midLat * rad);
  let sum = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.lng * rad * cos * R;
    const yi = polygon[i]!.lat * rad * R;
    const xj = polygon[j]!.lng * rad * cos * R;
    const yj = polygon[j]!.lat * rad * R;
    sum += xj * yi - xi * yj;
  }
  return Math.abs(sum) / 2;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
