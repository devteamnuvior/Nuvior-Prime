/**
 * Persistent routing cache — never stores API keys.
 */

import { prisma } from "@/lib/prisma";
import type { GeoPoint } from "@/domain/geo";
import type { RouteLeg } from "./types";

function cacheKey(origin: GeoPoint, destination: GeoPoint, mode: string): string {
  const o = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`;
  const d = `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;
  return `${mode}|${o}|${d}`;
}

export async function readRouteCache(
  origin: GeoPoint,
  destination: GeoPoint,
  mode: string,
): Promise<RouteLeg | null> {
  try {
    const key = cacheKey(origin, destination, mode);
    const row = await prisma.routeCache.findUnique({ where: { cacheKey: key } });
    if (!row) return null;
    if (row.expiresAt < new Date()) return null;
    return {
      distanceKm: row.distanceKm,
      durationMinutes: row.durationMinutes,
      mode: row.mode === "geodesic" ? "geodesic" : "driving",
      trafficAware: row.trafficAware,
      fromCache: true,
      provider: row.provider,
      fetchedAt: row.fetchedAt.toISOString(),
      fallback: "cache",
    };
  } catch {
    return null;
  }
}

export async function writeRouteCache(
  origin: GeoPoint,
  destination: GeoPoint,
  mode: string,
  leg: RouteLeg,
  ttlSeconds: number,
): Promise<void> {
  try {
    const key = cacheKey(origin, destination, mode);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await prisma.routeCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        originLat: origin.lat,
        originLng: origin.lng,
        destLat: destination.lat,
        destLng: destination.lng,
        mode: leg.mode,
        trafficAware: leg.trafficAware,
        distanceKm: leg.distanceKm,
        durationMinutes: leg.durationMinutes,
        provider: leg.provider,
        fetchedAt: new Date(leg.fetchedAt),
        expiresAt,
      },
      update: {
        distanceKm: leg.distanceKm,
        durationMinutes: leg.durationMinutes,
        trafficAware: leg.trafficAware,
        provider: leg.provider,
        fetchedAt: new Date(leg.fetchedAt),
        expiresAt,
        mode: leg.mode,
      },
    });
  } catch {
    // cache write best-effort
  }
}

/* ---------------- Phase 8.6 — route geometry cache ---------------- */

function geometryCacheKey(orderedPoints: GeoPoint[], mode: string): string {
  const path = orderedPoints.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(";");
  return `GEOM|${mode}|${path}`;
}

export async function readGeometryCache(
  orderedPoints: GeoPoint[],
  mode: string,
): Promise<{ encodedSegments: string[]; fetchedAt: string } | null> {
  try {
    const key = geometryCacheKey(orderedPoints, mode);
    const row = await prisma.routeCache.findUnique({ where: { cacheKey: key } });
    if (!row || !row.encodedPolyline) return null;
    if (row.expiresAt < new Date()) return null;
    const segments = JSON.parse(row.encodedPolyline) as string[];
    if (!Array.isArray(segments) || segments.length === 0) return null;
    return { encodedSegments: segments, fetchedAt: row.fetchedAt.toISOString() };
  } catch {
    return null;
  }
}

export async function writeGeometryCache(
  orderedPoints: GeoPoint[],
  mode: string,
  encodedSegments: string[],
  provider: string,
  trafficAware: boolean,
  ttlSeconds: number,
): Promise<void> {
  try {
    const key = geometryCacheKey(orderedPoints, mode);
    const first = orderedPoints[0]!;
    const last = orderedPoints[orderedPoints.length - 1]!;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const payload = JSON.stringify(encodedSegments);
    await prisma.routeCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        originLat: first.lat,
        originLng: first.lng,
        destLat: last.lat,
        destLng: last.lng,
        mode: "geometry",
        trafficAware,
        distanceKm: 0,
        durationMinutes: null,
        provider,
        encodedPolyline: payload,
        fetchedAt: new Date(),
        expiresAt,
      },
      update: {
        encodedPolyline: payload,
        trafficAware,
        provider,
        fetchedAt: new Date(),
        expiresAt,
      },
    });
  } catch {
    // cache write best-effort
  }
}
