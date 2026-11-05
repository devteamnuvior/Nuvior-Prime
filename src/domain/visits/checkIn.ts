/**
 * Clinic check-in / check-out. Pure helpers: how close a rep must be to a stop
 * before Check In appears, and what visit length a check-in suggests.
 */

import { haversineKm, type GeoPoint } from "@/domain/geo";
import { SLOT_MINUTES, VISIT_DURATIONS, type VisitDurationMinutes } from "@/domain/performance/visitSlots";

/** Within this many metres of a stop the rep counts as having arrived. GPS in a city is rarely better than ~50 m. */
export const CHECK_IN_RADIUS_M = 250;

export type CheckInDto = {
  id: string;
  placeId: string;
  checkedInAt: string;
  checkedOutAt: string | null;
};

export type LocationStatus = "idle" | "watching" | "denied" | "unavailable";

/** What the drawer should offer for one stop. */
export type PresenceState =
  | { kind: "checked_in"; checkIn: CheckInDto }
  | { kind: "checked_in_elsewhere"; checkIn: CheckInDto }
  | { kind: "arrived"; distanceM: number }
  | { kind: "no_location"; status: LocationStatus }
  | { kind: "away"; distanceM: number };

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  return Math.round(haversineKm(a, b) * 1000);
}

export function isWithinCheckInRadius(distanceM: number, radiusM = CHECK_IN_RADIUS_M): boolean {
  return distanceM <= radiusM;
}

/**
 * The slot count a stay suggests: elapsed time rounded to the nearest 45-minute
 * slot, never below one slot and never above the longest option. A 10-minute
 * drop-in is still one clinic; 70 minutes rounds to two.
 */
export function suggestedDurationMinutes(checkedInAt: Date | string, checkedOutAt: Date | string = new Date()): VisitDurationMinutes {
  const start = new Date(checkedInAt).getTime();
  const end = new Date(checkedOutAt).getTime();
  const elapsedMin = Math.max(0, (end - start) / 60_000);
  const slots = Math.max(1, Math.round(elapsedMin / SLOT_MINUTES));
  const minutes = slots * SLOT_MINUTES;
  const max = VISIT_DURATIONS[VISIT_DURATIONS.length - 1]!;
  return (minutes > max ? max : minutes) as VisitDurationMinutes;
}

export function presenceFor(input: {
  placeId: string;
  openCheckIn: CheckInDto | null;
  position: GeoPoint | null;
  locationStatus: LocationStatus;
  stop: GeoPoint | null;
}): PresenceState {
  const { placeId, openCheckIn, position, locationStatus, stop } = input;
  if (openCheckIn) {
    return openCheckIn.placeId === placeId ? { kind: "checked_in", checkIn: openCheckIn } : { kind: "checked_in_elsewhere", checkIn: openCheckIn };
  }
  if (!position || !stop) return { kind: "no_location", status: locationStatus };
  const distanceM = distanceMeters(position, stop);
  return isWithinCheckInRadius(distanceM) ? { kind: "arrived", distanceM } : { kind: "away", distanceM };
}

export function formatDistance(distanceM: number): string {
  if (distanceM < 1000) return `${distanceM} m`;
  return `${(distanceM / 1000).toFixed(distanceM < 10_000 ? 1 : 0)} km`;
}
