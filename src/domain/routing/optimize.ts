/**
 * Deterministic visit route planner — downstream of qualification.
 * Utility ≈ fit×W_fit + revisit×W_rev − travel×W_travel − schedulePenalty
 */

import type { GeoPoint } from "@/domain/geo";
import type { VisitListEntry } from "@/domain/visitList";
import {
  getRoutingConfig,
  minutesToClock,
  parseClockToMinutes,
  type RoutingConfig,
} from "./config";
import { assessOpeningHours } from "./openingHours";
import type { RouteLeg, RoutingProvider, TravelMatrix } from "@/providers/routing/types";
import { GeodesicRoutingProvider } from "@/providers/routing/types";

export type RouteExclusion = {
  accountId: string;
  businessName: string;
  reason: string;
};

export type PlannedRouteStop = VisitListEntry & {
  sequence: number;
  arrivalClock: string | null;
  departureClock: string | null;
  travelMinutesFromPrevious: number | null;
  travelDistanceKmFromPrevious: number | null;
  cumulativeDriveMinutes: number | null;
  plannedVisitMinutes: number;
  openingHoursState: string;
  openingHoursLabel: string;
  suggestedDropInWindow: string | null;
  routeReasons: string[];
  durationIsTrafficAware: boolean;
  /** True when travel minutes came from geodesic fallback — not drive time */
  durationIsGeodesicEstimate: boolean;
};

export type RoutePlanSummary = {
  stopCount: number;
  target: number;
  totalDriveMinutes: number | null;
  totalVisitMinutes: number;
  estimatedDayMinutes: number | null;
  routingProvider: string;
  trafficAware: boolean;
  maxRadiusKm: number;
  maxDriveMinutes: number | null;
  driveTimeConstraintEnforced: boolean;
  driveTimeConstraintWarning: string | null;
  radiusExhausted: boolean;
  scheduleCapacityExhausted: boolean;
  optimizationEnabled: boolean;
  excludedForRouting: RouteExclusion[];
  warnings: string[];
  dayStartClock: string;
  dayEndClock: string;
};

export type RoutePlanResult = {
  stops: PlannedRouteStop[];
  presentationStops: PlannedRouteStop[];
  summary: RoutePlanSummary;
};

export type PlanRouteInput = {
  startPoint: GeoPoint;
  qualifiedPool: VisitListEntry[];
  coordsByAccountId: Record<string, GeoPoint>;
  openingHoursByAccountId: Record<string, unknown | null | undefined>;
  dailyVisitTarget: number;
  maxRadiusKm: number;
  maxDriveMinutes: number | null;
  dayStartClock?: string | null;
  dayEndClock?: string | null;
  runDate?: Date;
  routing: RoutingProvider;
  config?: RoutingConfig;
};

export async function planVisitRoute(input: PlanRouteInput): Promise<RoutePlanResult> {
  const cfg = input.config ?? getRoutingConfig();
  const runDate = input.runDate ?? new Date();
  const dayStart = parseClockToMinutes(input.dayStartClock, 9 * 60);
  const dayEnd = parseClockToMinutes(input.dayEndClock, 17 * 60);
  const excluded: RouteExclusion[] = [];
  const planWarnings: string[] = [];

  const withCoords = input.qualifiedPool.filter((q) => {
    const c = input.coordsByAccountId[q.accountId];
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) {
      excluded.push({
        accountId: q.accountId,
        businessName: q.businessName,
        reason: "unresolved location",
      });
      return false;
    }
    return true;
  });

  const capped = [...withCoords]
    .sort((a, b) => {
      if (a.isRevisit !== b.isRevisit) return a.isRevisit ? -1 : 1;
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, cfg.maxCandidates);

  for (const q of withCoords) {
    if (!capped.find((c) => c.accountId === q.accountId)) {
      excluded.push({
        accountId: q.accountId,
        businessName: q.businessName,
        reason: "routing budget cap (candidate pool)",
      });
    }
  }

  if (!cfg.optimizationEnabled) {
    return legacyNearestPlan(
      input,
      capped,
      cfg,
      dayStart,
      dayEnd,
      runDate,
      excluded,
      planWarnings,
    );
  }

  const points: GeoPoint[] = [
    input.startPoint,
    ...capped.map((c) => input.coordsByAccountId[c.accountId]!),
  ];

  const trafficAware = cfg.trafficMode === "traffic_aware";
  let matrix: TravelMatrix;
  const compute = input.routing.computeMatrix?.bind(input.routing);

  if (compute) {
    matrix = await compute(points, {
      maxApiCalls: cfg.maxApiCalls,
      trafficAware,
      timeoutMs: cfg.timeoutMs,
    });
    planWarnings.push(...matrix.warnings);
  } else {
    matrix = await new GeodesicRoutingProvider().computeMatrix!(points, {
      maxApiCalls: cfg.maxApiCalls,
      trafficAware: false,
      timeoutMs: cfg.timeoutMs,
    });
    planWarnings.push("Provider lacked matrix — used geodesic");
  }

  let driveTimeEnforced = false;
  let driveTimeWarning: string | null = null;
  const feasible: { entry: VisitListEntry; idx: number; fromStart: RouteLeg }[] = [];

  for (let i = 0; i < capped.length; i++) {
    const entry = capped[i]!;
    const leg = matrix.cells[0]?.[i + 1];

    if (!leg) {
      if (input.maxDriveMinutes != null) {
        driveTimeWarning =
          "Hard drive-time constraint requested but routing data missing — not falsely enforced";
        excluded.push({
          accountId: entry.accountId,
          businessName: entry.businessName,
          reason: "routing unavailable — cannot enforce drive-time",
        });
        continue;
      }
      const geo = await new GeodesicRoutingProvider().distanceBetween(
        input.startPoint,
        input.coordsByAccountId[entry.accountId]!,
      );
      feasible.push({ entry, idx: i + 1, fromStart: geo });
      continue;
    }

    if (leg.mode === "driving" && leg.durationMinutes != null && input.maxDriveMinutes != null) {
      driveTimeEnforced = true;
      if (leg.durationMinutes > input.maxDriveMinutes) {
        excluded.push({
          accountId: entry.accountId,
          businessName: entry.businessName,
          reason: `outside max drive time (${leg.durationMinutes} > ${input.maxDriveMinutes} min)`,
        });
        continue;
      }
    } else if (
      input.maxDriveMinutes != null &&
      (leg.durationMinutes == null || leg.mode === "geodesic")
    ) {
      driveTimeWarning =
        "Hard drive-time constraint requested but duration not available as drive time — not falsely enforced";
      excluded.push({
        accountId: entry.accountId,
        businessName: entry.businessName,
        reason: "drive-time unverified",
      });
      continue;
    }

    const hours = assessOpeningHours(
      input.openingHoursByAccountId[entry.accountId],
      runDate,
      cfg,
    );
    if (hours.state === "closed") {
      excluded.push({
        accountId: entry.accountId,
        businessName: entry.businessName,
        reason: "closed today",
      });
      continue;
    }

    feasible.push({ entry, idx: i + 1, fromStart: leg });
  }

  const remaining = [...feasible];
  const stops: PlannedRouteStop[] = [];
  let currentIdx = 0;
  let clock = dayStart;
  let cumulativeDrive = 0;
  let scheduleExhausted = false;

  while (stops.length < input.dailyVisitTarget && remaining.length > 0) {
    let best: {
      item: (typeof remaining)[0];
      utility: number;
      travel: RouteLeg;
      reasons: string[];
      arrival: number;
      visitMin: number;
    } | null = null;

    for (const item of remaining) {
      const travel =
        (currentIdx === 0 && stops.length === 0
          ? item.fromStart
          : matrix.cells[currentIdx]?.[item.idx]) ?? item.fromStart;

      const travelMin = travelMinutes(travel);
      const isGeo = travel.mode === "geodesic" || travel.durationMinutes == null;

      let arrival = clock + travelMin;
      let schedulePenalty = 0;
      if (cfg.lunchEnabled && arrival >= cfg.lunchStartMinutes && arrival < cfg.lunchEndMinutes) {
        arrival = cfg.lunchEndMinutes;
        schedulePenalty += 15;
      }

      const visitMin = item.entry.isRevisit
        ? cfg.revisitVisitMinutes
        : cfg.defaultVisitMinutes;
      const departure = arrival + visitMin;
      if (departure > dayEnd) schedulePenalty += 1000;

      const hours = assessOpeningHours(
        input.openingHoursByAccountId[item.entry.accountId],
        runDate,
        cfg,
        arrival,
      );
      if (hours.state === "closed") schedulePenalty += 500;
      else if (hours.state === "opens_later" || hours.state === "closes_early") {
        schedulePenalty += 20;
      }

      const utility =
        item.entry.fitScore * cfg.weightFit +
        (item.entry.isRevisit ? cfg.weightRevisit : 0) -
        travelMin * cfg.weightTravelMinutes -
        schedulePenalty * cfg.weightSchedulePenalty;

      const reasons: string[] = [];
      if (item.entry.isRevisit) reasons.push("due revisit");
      reasons.push(`fit ${item.entry.fitScore}`);
      if (travelMin <= 15) reasons.push("low detour");
      if (hours.state === "unknown") reasons.push("hours UNKNOWN, verify");
      else if (hours.state === "open") reasons.push("open during planned arrival");
      if (isGeo) reasons.push("travel estimate geodesic (not drive time)");
      if (item.entry.fitScore >= 5) {
        reasons.push("selected high-fit over lower-fit nearby alternatives");
      }

      if (!best || utility > best.utility) {
        best = { item, utility, travel, reasons, arrival, visitMin };
      }
    }

    if (!best || best.utility < -500) {
      scheduleExhausted = true;
      for (const r of remaining) {
        excluded.push({
          accountId: r.entry.accountId,
          businessName: r.entry.businessName,
          reason: "workday capacity exceeded",
        });
      }
      break;
    }

    const departure = best.arrival + best.visitMin;
    if (departure > dayEnd && stops.length > 0) {
      scheduleExhausted = true;
      excluded.push({
        accountId: best.item.entry.accountId,
        businessName: best.item.entry.businessName,
        reason: "workday capacity exceeded",
      });
      remaining.splice(remaining.indexOf(best.item), 1);
      continue;
    }

    const hours = assessOpeningHours(
      input.openingHoursByAccountId[best.item.entry.accountId],
      runDate,
      cfg,
      best.arrival,
    );

    const tMin = travelMinutes(best.travel);
    cumulativeDrive += tMin;
    stops.push({
      ...best.item.entry,
      sequence: stops.length + 1,
      arrivalClock: minutesToClock(best.arrival),
      departureClock: minutesToClock(departure),
      travelMinutesFromPrevious: tMin,
      travelDistanceKmFromPrevious: best.travel.distanceKm,
      cumulativeDriveMinutes: cumulativeDrive,
      plannedVisitMinutes: best.visitMin,
      openingHoursState: hours.state,
      openingHoursLabel: hours.label,
      suggestedDropInWindow: hours.suggestedDropInWindow,
      routeReasons: best.reasons,
      durationIsTrafficAware: best.travel.trafficAware,
      durationIsGeodesicEstimate:
        best.travel.mode === "geodesic" || best.travel.durationMinutes == null,
    });

    clock = departure;
    currentIdx = best.item.idx;
    remaining.splice(remaining.indexOf(best.item), 1);
  }

  for (const r of remaining) {
    if (!excluded.find((e) => e.accountId === r.entry.accountId)) {
      excluded.push({
        accountId: r.entry.accountId,
        businessName: r.entry.businessName,
        reason:
          stops.length >= input.dailyVisitTarget
            ? "target reached"
            : "not selected by optimizer",
      });
    }
  }

  if (stops.some((s) => s.durationIsGeodesicEstimate)) {
    planWarnings.push(
      "Some travel times are geodesic estimates — not labeled as verified drive times",
    );
  }

  const totalVisit = stops.reduce((s, x) => s + x.plannedVisitMinutes, 0);
  const totalDrive = stops.reduce((s, x) => s + (x.travelMinutesFromPrevious ?? 0), 0);

  return {
    stops,
    presentationStops: stops,
    summary: {
      stopCount: stops.length,
      target: input.dailyVisitTarget,
      totalDriveMinutes: totalDrive,
      totalVisitMinutes: totalVisit,
      estimatedDayMinutes:
        stops.length > 0
          ? parseClockToMinutes(stops[stops.length - 1]!.departureClock, dayEnd) - dayStart
          : null,
      routingProvider: matrix.provider,
      trafficAware: trafficAware && stops.some((s) => s.durationIsTrafficAware),
      maxRadiusKm: input.maxRadiusKm,
      maxDriveMinutes: input.maxDriveMinutes,
      driveTimeConstraintEnforced: driveTimeEnforced,
      driveTimeConstraintWarning: driveTimeWarning,
      radiusExhausted: stops.length < input.dailyVisitTarget && !scheduleExhausted,
      scheduleCapacityExhausted: scheduleExhausted,
      optimizationEnabled: true,
      excludedForRouting: excluded,
      warnings: planWarnings,
      dayStartClock: minutesToClock(dayStart),
      dayEndClock: minutesToClock(dayEnd),
    },
  };
}

async function legacyNearestPlan(
  input: PlanRouteInput,
  capped: VisitListEntry[],
  cfg: RoutingConfig,
  dayStart: number,
  dayEnd: number,
  runDate: Date,
  excluded: RouteExclusion[],
  planWarnings: string[],
): Promise<RoutePlanResult> {
  planWarnings.push("Route optimization disabled — nearest→farthest order");
  const nearestFirst = [...capped].sort((a, b) => a.distanceKm - b.distanceKm);
  const sliced = nearestFirst.slice(0, input.dailyVisitTarget);
  for (const c of nearestFirst.slice(input.dailyVisitTarget)) {
    excluded.push({
      accountId: c.accountId,
      businessName: c.businessName,
      reason: "target reached",
    });
  }

  let clock = dayStart;
  let cumulative = 0;
  const stops: PlannedRouteStop[] = [];
  let prev: GeoPoint = input.startPoint;

  for (const entry of sliced) {
    const coords = input.coordsByAccountId[entry.accountId];
    const visitMin = entry.isRevisit ? cfg.revisitVisitMinutes : cfg.defaultVisitMinutes;
    let travelMin: number | null = null;
    let travelKm = entry.distanceKm;
    let isGeo = true;
    if (coords) {
      const leg = await input.routing.distanceBetween(prev, coords);
      travelKm = leg.distanceKm;
      travelMin = leg.durationMinutes;
      isGeo = leg.mode === "geodesic" || leg.durationMinutes == null;
      prev = coords;
    }
    const t = travelMin ?? estimateMinutesFromKm(travelKm);
    let arrival = clock + t;
    if (cfg.lunchEnabled && arrival >= cfg.lunchStartMinutes && arrival < cfg.lunchEndMinutes) {
      arrival = cfg.lunchEndMinutes;
    }
    const departure = arrival + visitMin;
    cumulative += t;
    const hours = assessOpeningHours(
      input.openingHoursByAccountId[entry.accountId],
      runDate,
      cfg,
      arrival,
    );
    stops.push({
      ...entry,
      sequence: stops.length + 1,
      arrivalClock: minutesToClock(arrival),
      departureClock: minutesToClock(departure),
      travelMinutesFromPrevious: t,
      travelDistanceKmFromPrevious: travelKm,
      cumulativeDriveMinutes: cumulative,
      plannedVisitMinutes: visitMin,
      openingHoursState: hours.state,
      openingHoursLabel: hours.label,
      suggestedDropInWindow: hours.suggestedDropInWindow,
      routeReasons: ["legacy nearest order", `fit ${entry.fitScore}`],
      durationIsTrafficAware: false,
      durationIsGeodesicEstimate: isGeo,
    });
    clock = departure;
  }

  return {
    stops,
    presentationStops: [...stops].sort((a, b) => {
      const p = a.postalCodePrefix.localeCompare(b.postalCodePrefix);
      if (p !== 0) return p;
      return b.fitScore - a.fitScore;
    }),
    summary: {
      stopCount: stops.length,
      target: input.dailyVisitTarget,
      totalDriveMinutes: cumulative,
      totalVisitMinutes: stops.reduce((s, x) => s + x.plannedVisitMinutes, 0),
      estimatedDayMinutes:
        stops.length > 0
          ? parseClockToMinutes(stops[stops.length - 1]!.departureClock, dayEnd) - dayStart
          : null,
      routingProvider: input.routing.name,
      trafficAware: false,
      maxRadiusKm: input.maxRadiusKm,
      maxDriveMinutes: input.maxDriveMinutes,
      driveTimeConstraintEnforced: false,
      driveTimeConstraintWarning:
        input.maxDriveMinutes != null
          ? "Optimization off — drive-time constraint not applied in legacy mode"
          : null,
      radiusExhausted: capped.length < input.dailyVisitTarget,
      scheduleCapacityExhausted: false,
      optimizationEnabled: false,
      excludedForRouting: excluded,
      warnings: planWarnings,
      dayStartClock: minutesToClock(dayStart),
      dayEndClock: minutesToClock(dayEnd),
    },
  };
}

function travelMinutes(leg: RouteLeg): number {
  if (leg.durationMinutes != null) return leg.durationMinutes;
  return estimateMinutesFromKm(leg.distanceKm);
}

function estimateMinutesFromKm(km: number): number {
  return Math.max(3, Math.round((km / 28) * 60));
}
