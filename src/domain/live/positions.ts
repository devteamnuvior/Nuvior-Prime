/**
 * Live map — pure rules for a rep's last known position.
 * No Prisma, no React: the API, the seed, the simulator and the UI all read these.
 */

import { haversineKm, type GeoPoint } from "@/domain/geo";

/** A rep counts as "at" a clinic when their fix lands within this radius of it. */
export const AT_CLINIC_RADIUS_M = 120;
/** A fix older than this no longer describes where the rep is. */
export const STALE_AFTER_MS = 10 * 60_000;
/** After this long with no fix the rep is shown as offline. */
export const OFFLINE_AFTER_MS = 3 * 60 * 60_000;
/** Below this speed a fresh fix means the rep is standing still. */
export const MOVING_SPEED_MPS = 0.8;
/** How long a marker keeps its "just updated" pulse. */
export const RECENT_WINDOW_MS = 20_000;
/** Rep devices report at most this often while sharing. */
export const REPORT_INTERVAL_MS = 5_000;
/** Admin live map refresh cadence. */
export const POLL_INTERVAL_MS = 4_000;

export type RepLiveStatus = "at_clinic" | "travelling" | "idle" | "offline";

export const REP_LIVE_STATUS_LABELS: Record<RepLiveStatus, string> = {
  at_clinic: "At Clinic",
  travelling: "Travelling",
  idle: "Idle",
  offline: "Offline",
};

export type PositionReport = {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  headingDeg?: number | null;
  speedMps?: number | null;
  recordedAt?: string | null;
};

export type RepPositionDto = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  headingDeg: number | null;
  speedMps: number | null;
  recordedAt: string;
  clinic: { id: string; name: string; city: string } | null;
};

/** One row of the live map: a rep and, when known, where they are. */
export type LiveRepDto = {
  id: string;
  name: string;
  email: string;
  provinces: string[];
  position: RepPositionDto | null;
  status: RepLiveStatus;
};

/** Pick the closest clinic within AT_CLINIC_RADIUS_M, or null when the rep is between visits. */
export function nearestClinic<T extends GeoPoint>(fix: GeoPoint, clinics: T[], radiusM = AT_CLINIC_RADIUS_M): T | null {
  let best: T | null = null;
  let bestKm = radiusM / 1000;
  for (const c of clinics) {
    const d = haversineKm(fix, c);
    if (d <= bestKm) {
      best = c;
      bestKm = d;
    }
  }
  return best;
}

export function deriveStatus(
  position: { recordedAt: string | Date; speedMps: number | null; clinic: unknown | null } | null,
  now = Date.now(),
): RepLiveStatus {
  if (!position) return "offline";
  const age = now - new Date(position.recordedAt).getTime();
  if (age > OFFLINE_AFTER_MS) return "offline";
  if (position.clinic) return "at_clinic";
  if (age > STALE_AFTER_MS) return "idle";
  if (position.speedMps != null && position.speedMps < MOVING_SPEED_MPS) return "idle";
  return "travelling";
}

export function isRecent(recordedAt: string | Date, now = Date.now(), window = RECENT_WINDOW_MS): boolean {
  return now - new Date(recordedAt).getTime() <= window;
}

/** Bounding box (in degrees) around a fix, wide enough to hold every clinic within `radiusM`. */
export function boundingBox(fix: GeoPoint, radiusM: number): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.max(0.2, Math.cos((fix.lat * Math.PI) / 180)));
  return { minLat: fix.lat - dLat, maxLat: fix.lat + dLat, minLng: fix.lng - dLng, maxLng: fix.lng + dLng };
}

export type StatusCounts = Record<RepLiveStatus, number>;

export function countByStatus(rows: { status: RepLiveStatus }[]): StatusCounts {
  const out: StatusCounts = { at_clinic: 0, travelling: 0, idle: 0, offline: 0 };
  for (const r of rows) out[r.status] += 1;
  return out;
}

const STATUS_ORDER: Record<RepLiveStatus, number> = { at_clinic: 0, travelling: 1, idle: 2, offline: 3 };

/** Panel order: active reps first, then by name. */
export function sortReps<T extends { name: string; status: RepLiveStatus }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name));
}
