/**
 * Phase 8.8 — resolve the planning province from a start location.
 * Authorization (allowedProvinces) is always the final gate.
 * Never silently switch a rep into a province they cannot access.
 */

import type { GeoPoint } from "@/domain/geo";

export type ProvinceResolution =
  | { ok: true; provinceCode: string; source: "place" | "postal" | "coords" | "single-territory" }
  | { ok: false; reason: "outside-territory" | "unresolved"; inferred: string | null };

type ProvinceSource = Extract<ProvinceResolution, { ok: true }>["source"];

/** Canadian FSA (first letter) → province/territory. X is NT/NU — left unresolved. */
const FSA_LETTER: Record<string, string> = {
  A: "NL",
  B: "NS",
  C: "PE",
  E: "NB",
  G: "QC",
  H: "QC",
  J: "QC",
  K: "ON",
  L: "ON",
  M: "ON",
  N: "ON",
  P: "ON",
  R: "MB",
  S: "SK",
  T: "AB",
  V: "BC",
  Y: "YT",
};

/** Coarse bounding boxes for pin/geolocation when no postal/place province exists. */
const BOXES: { code: string; minLat: number; maxLat: number; minLng: number; maxLng: number }[] = [
  { code: "ON", minLat: 41.6, maxLat: 56.95, minLng: -95.2, maxLng: -74.25 },
  { code: "QC", minLat: 44.9, maxLat: 62.7, minLng: -79.8, maxLng: -57.0 },
  { code: "BC", minLat: 48.2, maxLat: 60.05, minLng: -139.1, maxLng: -114.0 },
  { code: "AB", minLat: 48.95, maxLat: 60.05, minLng: -120.05, maxLng: -109.95 },
  { code: "MB", minLat: 48.95, maxLat: 60.05, minLng: -102.05, maxLng: -88.9 },
  { code: "SK", minLat: 48.95, maxLat: 60.05, minLng: -110.05, maxLng: -101.3 },
  { code: "NS", minLat: 43.3, maxLat: 47.1, minLng: -66.5, maxLng: -59.6 },
  { code: "NB", minLat: 44.5, maxLat: 48.2, minLng: -69.1, maxLng: -63.6 },
  { code: "NL", minLat: 46.5, maxLat: 60.4, minLng: -67.9, maxLng: -52.5 },
  { code: "PE", minLat: 45.9, maxLat: 47.1, minLng: -64.5, maxLng: -61.9 },
  { code: "YT", minLat: 60.0, maxLat: 69.7, minLng: -141.1, maxLng: -123.7 },
  { code: "NT", minLat: 60.0, maxLat: 78.9, minLng: -136.5, maxLng: -101.9 },
  { code: "NU", minLat: 51.6, maxLat: 83.2, minLng: -120.8, maxLng: -61.0 },
];

export const OUTSIDE_TERRITORY_MESSAGE =
  "That location is outside your assigned territory. Choose a start in a province you cover.";

export function inferProvinceFromPostal(postal: string | null | undefined): string | null {
  if (!postal) return null;
  const letter = postal.trim().toUpperCase().charAt(0);
  return FSA_LETTER[letter] ?? null;
}

export function inferProvinceFromCoords(point: GeoPoint): string[] {
  return BOXES.filter(
    (b) =>
      point.lat >= b.minLat &&
      point.lat <= b.maxLat &&
      point.lng >= b.minLng &&
      point.lng <= b.maxLng,
  ).map((b) => b.code);
}

/**
 * Resolve the province used for today's planning.
 *
 * Priority: Google place/address component → postal FSA → coordinate boxes →
 * the user's sole authorized province.
 */
export function resolvePlanningProvince(input: {
  placeProvince: string | null | undefined;
  postalCode: string | null | undefined;
  coords: GeoPoint | null;
  allowedProvinces: string[];
}): ProvinceResolution {
  const allowed = input.allowedProvinces.filter(Boolean);
  const candidates: { code: string; source: ProvinceSource }[] = [];

  if (input.placeProvince) {
    candidates.push({ code: input.placeProvince.toUpperCase(), source: "place" });
  }
  const fromPostal = inferProvinceFromPostal(input.postalCode);
  if (fromPostal) candidates.push({ code: fromPostal, source: "postal" });
  if (input.coords) {
    for (const code of inferProvinceFromCoords(input.coords)) {
      candidates.push({ code, source: "coords" });
    }
  }

  for (const c of candidates) {
    if (allowed.includes(c.code)) {
      return { ok: true, provinceCode: c.code, source: c.source };
    }
  }

  const inferred = candidates[0]?.code ?? null;
  if (inferred && !allowed.includes(inferred)) {
    return { ok: false, reason: "outside-territory", inferred };
  }

  if (allowed.length === 1) {
    return { ok: true, provinceCode: allowed[0]!, source: "single-territory" };
  }

  return { ok: false, reason: "unresolved", inferred: null };
}

export const AREA_OUTSIDE_TERRITORY_MESSAGE =
  "Today's area is outside your assigned territory. Redraw in a province you cover, or use travel reach.";

/**
 * A drawn polygon is outside territory when none of its vertices resolve to an
 * authorized province. Border / unresolved vertices are allowed.
 */
export function drawnAreaInTerritory(
  points: GeoPoint[],
  allowedProvinces: string[],
): { ok: true } | { ok: false; message: string } {
  if (points.length === 0 || allowedProvinces.length === 0) return { ok: true };
  let anyResolved = false;
  for (const p of points) {
    const codes = inferProvinceFromCoords(p);
    if (codes.length === 0) continue;
    anyResolved = true;
    if (codes.some((c) => allowedProvinces.includes(c))) return { ok: true };
  }
  if (!anyResolved) return { ok: true };
  return { ok: false, message: AREA_OUTSIDE_TERRITORY_MESSAGE };
}
