import { haversineKm, type GeoPoint } from "@/domain/geo";

/**
 * Phase 8 routing — domain never depends on Google response shapes.
 */

export type TravelMode = "geodesic" | "driving";

export type RouteLeg = {
  distanceKm: number;
  /** null when geodesic / unknown — never treat as verified drive time */
  durationMinutes: number | null;
  mode: TravelMode;
  trafficAware: boolean;
  fromCache: boolean;
  provider: string;
  fetchedAt: string;
  fallback: "none" | "cache" | "geodesic" | "unavailable";
};

export type MatrixCell = RouteLeg & {
  originIndex: number;
  destinationIndex: number;
};

export type TravelMatrix = {
  points: GeoPoint[];
  /** cells[i][j] = travel from points[i] to points[j]; null if not computed */
  cells: (RouteLeg | null)[][];
  apiCalls: number;
  provider: string;
  warnings: string[];
};

/**
 * Phase 8.6 — real road geometry for the final optimized stop sequence.
 * Presentation-only: never used for qualification or optimization decisions.
 */
export type RouteGeometryResult = {
  /** Encoded polylines, one per sequential computeRoutes segment. */
  encodedSegments: string[];
  provider: string;
  trafficAware: boolean;
  fetchedAt: string;
  fromCache: boolean;
  apiCalls: number;
};

export interface RoutingProvider {
  readonly name: string;
  distanceBetween(origin: GeoPoint, destination: GeoPoint): Promise<RouteLeg>;
  /**
   * Optional batch matrix. Default implementation may call distanceBetween with budget.
   * points[0] is typically the start; remaining are candidates.
   */
  computeMatrix?(
    points: GeoPoint[],
    opts: { maxApiCalls: number; trafficAware: boolean; timeoutMs: number },
  ): Promise<TravelMatrix>;
  /**
   * Optional road geometry for a final ordered sequence [start, stop1 … stopN].
   * Returns null when geometry is unavailable — callers must fall back to an
   * honestly-labelled schematic line, never a fake road route.
   */
  computeRouteGeometry?(
    orderedPoints: GeoPoint[],
    opts: { maxApiCalls: number; trafficAware: boolean; timeoutMs: number },
  ): Promise<RouteGeometryResult | null>;
}

export class GeodesicRoutingProvider implements RoutingProvider {
  readonly name = "geodesic";

  async distanceBetween(origin: GeoPoint, destination: GeoPoint): Promise<RouteLeg> {
    return {
      distanceKm: round1(haversineKm(origin, destination)),
      durationMinutes: null,
      mode: "geodesic",
      trafficAware: false,
      fromCache: false,
      provider: this.name,
      fetchedAt: new Date().toISOString(),
      fallback: "none",
    };
  }

  async computeMatrix(
    points: GeoPoint[],
    opts: { maxApiCalls: number; trafficAware: boolean; timeoutMs: number },
  ): Promise<TravelMatrix> {
    void opts;
    const n = points.length;
    const cells: (RouteLeg | null)[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => null),
    );
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        cells[i]![j] = await this.distanceBetween(points[i]!, points[j]!);
      }
    }
    return {
      points,
      cells,
      apiCalls: 0,
      provider: this.name,
      warnings: ["Geodesic matrix — durations are not drive times"],
    };
  }
}

/** Synthetic urban drive estimate for tests — clearly mode=driving from mock. */
export class MockRoutingProvider implements RoutingProvider {
  readonly name = "mock";
  private unavailable: boolean;

  constructor(unavailable = false) {
    this.unavailable = unavailable;
  }

  async distanceBetween(origin: GeoPoint, destination: GeoPoint): Promise<RouteLeg> {
    if (this.unavailable) {
      return {
        distanceKm: round1(haversineKm(origin, destination)),
        durationMinutes: null,
        mode: "geodesic",
        trafficAware: false,
        fromCache: false,
        provider: this.name,
        fetchedAt: new Date().toISOString(),
        fallback: "unavailable",
      };
    }
    const geo = haversineKm(origin, destination);
    // Road factor ~1.35, ~28 km/h effective urban average
    const roadKm = geo * 1.35;
    const durationMinutes = Math.max(3, Math.round((roadKm / 28) * 60));
    return {
      distanceKm: round1(roadKm),
      durationMinutes,
      mode: "driving",
      trafficAware: false,
      fromCache: false,
      provider: this.name,
      fetchedAt: new Date().toISOString(),
      fallback: "none",
    };
  }

  async computeMatrix(
    points: GeoPoint[],
    opts: { maxApiCalls: number; trafficAware: boolean; timeoutMs: number },
  ): Promise<TravelMatrix> {
    const n = points.length;
    const cells: (RouteLeg | null)[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => null),
    );
    let apiCalls = 0;
    const warnings: string[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (apiCalls >= opts.maxApiCalls) {
          warnings.push("Mock routing budget exhausted — partial matrix");
          return { points, cells, apiCalls, provider: this.name, warnings };
        }
        cells[i]![j] = await this.distanceBetween(points[i]!, points[j]!);
        apiCalls += 1;
      }
    }
    return { points, cells, apiCalls, provider: this.name, warnings };
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export { haversineKm };
