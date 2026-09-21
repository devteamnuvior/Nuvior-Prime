/**
 * Google Routes API — computeRouteMatrix (current).
 * Enable "Routes API" on the Google Cloud project.
 * Docs: https://developers.google.com/maps/documentation/routes/compute_route_matrix
 */

import type { GeoPoint } from "@/domain/geo";
import { haversineKm } from "@/domain/geo";
import { segmentRouteRequests } from "@/domain/routing/polyline";
import type { RouteGeometryResult, RouteLeg, RoutingProvider, TravelMatrix } from "./types";
import {
  readGeometryCache,
  readRouteCache,
  writeGeometryCache,
  writeRouteCache,
} from "./routeCache";
import { resolveGoogleServerKey } from "@/lib/googleServerKey";

export type GoogleRoutingConfig = {
  apiKey: string;
  cacheTtlSeconds: number;
  timeoutMs: number;
  trafficAware: boolean;
};

const MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

export class GoogleRoutingProvider implements RoutingProvider {
  readonly name = "google";
  private apiCalls = 0;

  constructor(private readonly config: GoogleRoutingConfig) {}

  getApiCalls(): number {
    return this.apiCalls;
  }

  async distanceBetween(origin: GeoPoint, destination: GeoPoint): Promise<RouteLeg> {
    const matrix = await this.computeMatrix([origin, destination], {
      maxApiCalls: 1,
      trafficAware: this.config.trafficAware,
      timeoutMs: this.config.timeoutMs,
    });
    return (
      matrix.cells[0]?.[1] ?? {
        distanceKm: round1(haversineKm(origin, destination)),
        durationMinutes: null,
        mode: "geodesic" as const,
        trafficAware: false,
        fromCache: false,
        provider: this.name,
        fetchedAt: new Date().toISOString(),
        fallback: "unavailable" as const,
      }
    );
  }

  async computeMatrix(
    points: GeoPoint[],
    opts: { maxApiCalls: number; trafficAware: boolean; timeoutMs: number },
  ): Promise<TravelMatrix> {
    const n = points.length;
    const cells: (RouteLeg | null)[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => null),
    );
    const warnings: string[] = [];
    let apiCalls = 0;
    const trafficAware = opts.trafficAware && this.config.trafficAware;
    const modeKey = trafficAware ? "DRIVE_TRAFFIC" : "DRIVE";

    // Fill from cache first
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const cached = await readRouteCache(points[i]!, points[j]!, modeKey);
        if (cached) {
          cells[i]![j] = { ...cached, fromCache: true, provider: this.name };
        }
      }
    }

    // Batch missing as full matrix if budget allows, else pairwise
    const missing: { i: number; j: number }[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && !cells[i]![j]) missing.push({ i, j });
      }
    }

    if (missing.length === 0) {
      return { points, cells, apiCalls: 0, provider: this.name, warnings };
    }

    if (apiCalls + 1 > opts.maxApiCalls) {
      warnings.push("Routing API budget exhausted before matrix fetch");
      return { points, cells, apiCalls, provider: this.name, warnings };
    }

    // Prefer one matrix call for all points when n is small
    try {
      const body = {
        origins: points.map((p) => waypoint(p)),
        destinations: points.map((p) => waypoint(p)),
        travelMode: "DRIVE",
        routingPreference: trafficAware ? "TRAFFIC_AWARE" : "TRAFFIC_UNAWARE",
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
      const res = await fetch(MATRIX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.config.apiKey,
          "X-Goog-FieldMask":
            "originIndex,destinationIndex,duration,distanceMeters,status,condition",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      apiCalls += 1;
      this.apiCalls += 1;

      if (!res.ok) {
        warnings.push(`Google Routes matrix HTTP ${res.status}`);
        return { points, cells, apiCalls, provider: this.name, warnings };
      }

      // Response is NDJSON stream of elements
      const text = await res.text();
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        try {
          const el = JSON.parse(line) as {
            originIndex?: number;
            destinationIndex?: number;
            duration?: string;
            distanceMeters?: number;
            condition?: string;
          };
          const i = el.originIndex ?? -1;
          const j = el.destinationIndex ?? -1;
          if (i < 0 || j < 0 || i === j) continue;
          if (el.condition && el.condition !== "ROUTE_EXISTS") continue;
          const durationMinutes = parseDurationSeconds(el.duration);
          const distanceKm = el.distanceMeters != null ? el.distanceMeters / 1000 : haversineKm(points[i]!, points[j]!);
          const leg: RouteLeg = {
            distanceKm: round1(distanceKm),
            durationMinutes,
            mode: "driving",
            trafficAware,
            fromCache: false,
            provider: this.name,
            fetchedAt: new Date().toISOString(),
            fallback: "none",
          };
          cells[i]![j] = leg;
          await writeRouteCache(points[i]!, points[j]!, modeKey, leg, this.config.cacheTtlSeconds);
        } catch {
          // skip malformed line
        }
      }
    } catch (e) {
      warnings.push(
        `Google Routes matrix failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    return { points, cells, apiCalls, provider: this.name, warnings };
  }

  /**
   * Real road geometry for the final ordered sequence via computeRoutes.
   * Segments requests to respect the 25-intermediate-waypoint limit; segments
   * chain on shared boundary stops so the rendered route is continuous and no
   * stop is dropped. Whole-sequence result is cached (keyed by exact ordered
   * coordinates + traffic mode).
   */
  async computeRouteGeometry(
    orderedPoints: GeoPoint[],
    opts: { maxApiCalls: number; trafficAware: boolean; timeoutMs: number },
  ): Promise<RouteGeometryResult | null> {
    if (orderedPoints.length < 2) return null;
    const trafficAware = opts.trafficAware && this.config.trafficAware;
    const modeKey = trafficAware ? "DRIVE_TRAFFIC" : "DRIVE";

    const cached = await readGeometryCache(orderedPoints, modeKey);
    if (cached) {
      return {
        encodedSegments: cached.encodedSegments,
        provider: this.name,
        trafficAware,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
        apiCalls: 0,
      };
    }

    const segments = segmentRouteRequests(orderedPoints);
    if (segments.length > opts.maxApiCalls) {
      return null; // budget would be exceeded — honest fallback instead
    }

    const encodedSegments: string[] = [];
    let apiCalls = 0;
    for (const seg of segments) {
      const body = {
        origin: latLngWaypoint(seg.origin),
        destination: latLngWaypoint(seg.destination),
        intermediates: seg.intermediates.map((p) => latLngWaypoint(p)),
        travelMode: "DRIVE",
        routingPreference: trafficAware ? "TRAFFIC_AWARE" : "TRAFFIC_UNAWARE",
        polylineQuality: "OVERVIEW",
      };
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
        const res = await fetch(ROUTES_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": this.config.apiKey,
            "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
        apiCalls += 1;
        this.apiCalls += 1;
        if (!res.ok) return null;
        const json = (await res.json()) as {
          routes?: { polyline?: { encodedPolyline?: string } }[];
        };
        const encoded = json.routes?.[0]?.polyline?.encodedPolyline;
        if (!encoded) return null;
        encodedSegments.push(encoded);
      } catch {
        return null; // partial geometry is worse than an honest schematic
      }
    }

    await writeGeometryCache(
      orderedPoints,
      modeKey,
      encodedSegments,
      this.name,
      trafficAware,
      this.config.cacheTtlSeconds,
    );

    return {
      encodedSegments,
      provider: this.name,
      trafficAware,
      fetchedAt: new Date().toISOString(),
      fromCache: false,
      apiCalls,
    };
  }
}

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

function latLngWaypoint(p: GeoPoint) {
  return { location: { latLng: { latitude: p.lat, longitude: p.lng } } };
}

function waypoint(p: GeoPoint) {
  return {
    waypoint: {
      location: {
        latLng: { latitude: p.lat, longitude: p.lng },
      },
    },
  };
}

function parseDurationSeconds(d: string | undefined): number | null {
  if (!d) return null;
  // "123s" or "123.5s"
  const m = /^(\d+(?:\.\d+)?)s$/.exec(d);
  if (!m) return null;
  return Math.round(Number(m[1]) / 60);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function createGoogleRoutingProviderFromEnv(
  opts: { cacheTtlSeconds: number; timeoutMs: number; trafficAware: boolean },
): GoogleRoutingProvider | null {
  const key = process.env.GOOGLE_ROUTES_API_KEY?.trim() || resolveGoogleServerKey() || "";
  if (!key) return null;
  return new GoogleRoutingProvider({
    apiKey: key,
    cacheTtlSeconds: opts.cacheTtlSeconds,
    timeoutMs: opts.timeoutMs,
    trafficAware: opts.trafficAware,
  });
}
