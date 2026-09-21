import type { GeoPoint } from "@/domain/geo";

/**
 * Google encoded-polyline decoding (precision 1e-5).
 * Pure and isomorphic — used server-side in tests and client-side to render
 * Routes API geometry without loading the Maps geometry library.
 * Spec: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    lat += decodeValue();
    lng += decodeValue();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;

  function decodeValue(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
}

export type RouteSegmentPlan<T> = {
  origin: T;
  intermediates: T[];
  destination: T;
};

/** Routes API computeRoutes limit on intermediate waypoints per request. */
export const MAX_INTERMEDIATES_PER_REQUEST = 25;

/**
 * Split an ordered point sequence [start, stop1 … stopN] into sequential
 * computeRoutes requests that each respect the intermediate-waypoint limit.
 * Consecutive segments share their boundary point (destination of one is the
 * origin of the next), so rendering all segments yields one continuous route.
 * Stop order is preserved exactly and no stop is ever dropped.
 */
export function segmentRouteRequests<T>(
  orderedPoints: T[],
  maxIntermediates: number = MAX_INTERMEDIATES_PER_REQUEST,
): RouteSegmentPlan<T>[] {
  if (orderedPoints.length < 2) return [];
  const maxPointsPerSegment = maxIntermediates + 2;
  const segments: RouteSegmentPlan<T>[] = [];
  let startIdx = 0;
  while (startIdx < orderedPoints.length - 1) {
    const endIdx = Math.min(startIdx + maxPointsPerSegment - 1, orderedPoints.length - 1);
    segments.push({
      origin: orderedPoints[startIdx]!,
      intermediates: orderedPoints.slice(startIdx + 1, endIdx),
      destination: orderedPoints[endIdx]!,
    });
    startIdx = endIdx;
  }
  return segments;
}
