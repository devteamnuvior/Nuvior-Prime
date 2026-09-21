/**
 * Phase 8 routing / schedule configuration — domain constants, not UI.
 */

export type RoutingTrafficMode = "none" | "traffic_unaware" | "traffic_aware";

export type RoutingConfig = {
  provider: "geodesic" | "mock" | "google";
  optimizationEnabled: boolean;
  maxCandidates: number;
  maxApiCalls: number;
  cacheTtlSeconds: number;
  timeoutMs: number;
  trafficMode: RoutingTrafficMode;
  /** Allow geodesic duration/distance when real routing fails (never label as drive time). */
  allowGeodesicFallback: boolean;
  defaultVisitMinutes: number;
  revisitVisitMinutes: number;
  lunchEnabled: boolean;
  lunchStartMinutes: number; // minutes from midnight
  lunchEndMinutes: number;
  /** Avoid first N minutes after open for drop-in suggestion */
  avoidAfterOpenMinutes: number;
  /** Avoid last N minutes before close */
  avoidBeforeCloseMinutes: number;
  /** Utility weights */
  weightFit: number;
  weightRevisit: number;
  weightTravelMinutes: number;
  weightSchedulePenalty: number;
};

export function getRoutingConfig(): RoutingConfig {
  const provider = (process.env.ROUTING_PROVIDER ?? "geodesic").toLowerCase() as RoutingConfig["provider"];
  const traffic = (process.env.ROUTING_TRAFFIC_MODE ?? "traffic_unaware").toLowerCase();

  return {
    provider: ["geodesic", "mock", "google"].includes(provider) ? provider : "geodesic",
    optimizationEnabled:
      (process.env.ROUTE_OPTIMIZATION_ENABLED ?? "true").toLowerCase() !== "false",
    maxCandidates: num(process.env.ROUTING_MAX_CANDIDATES, 40),
    maxApiCalls: num(process.env.ROUTING_MAX_API_CALLS, 80),
    cacheTtlSeconds: num(process.env.ROUTING_CACHE_TTL_SECONDS, 86400),
    timeoutMs: num(process.env.ROUTING_TIMEOUT_MS, 12000),
    trafficMode:
      traffic === "none" || traffic === "traffic_aware" || traffic === "traffic_unaware"
        ? traffic
        : "traffic_unaware",
    allowGeodesicFallback:
      (process.env.ROUTING_ALLOW_GEODESIC_FALLBACK ?? "true").toLowerCase() !== "false",
    defaultVisitMinutes: num(process.env.ROUTING_DEFAULT_VISIT_MINUTES, 20),
    revisitVisitMinutes: num(process.env.ROUTING_REVISIT_VISIT_MINUTES, 25),
    lunchEnabled: (process.env.ROUTING_LUNCH_ENABLED ?? "true").toLowerCase() !== "false",
    lunchStartMinutes: parseHm(process.env.ROUTING_LUNCH_START ?? "12:00", 12 * 60),
    lunchEndMinutes: parseHm(process.env.ROUTING_LUNCH_END ?? "14:00", 14 * 60),
    avoidAfterOpenMinutes: num(process.env.ROUTING_AVOID_AFTER_OPEN_MINUTES, 60),
    avoidBeforeCloseMinutes: num(process.env.ROUTING_AVOID_BEFORE_CLOSE_MINUTES, 60),
    weightFit: num(process.env.ROUTING_WEIGHT_FIT, 12),
    weightRevisit: num(process.env.ROUTING_WEIGHT_REVISIT, 40),
    weightTravelMinutes: num(process.env.ROUTING_WEIGHT_TRAVEL, 1),
    weightSchedulePenalty: num(process.env.ROUTING_WEIGHT_SCHEDULE, 2),
  };
}

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseHm(v: string, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return fallback;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return fallback;
  return h * 60 + min;
}

export function parseClockToMinutes(v: string | null | undefined, fallback: number): number {
  if (!v) return fallback;
  return parseHm(v, fallback);
}

export function minutesToClock(m: number): string {
  const clamped = ((m % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const min = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
