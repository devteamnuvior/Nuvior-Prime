/**
 * validate:routing — Toronto fixture with mock + geodesic routing.
 *
 *   npm run validate:routing
 */

import { runProspectSearch } from "@/lib/prospecting";

async function runMode(label: string, env: Record<string, string>) {
  const prev: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    prev[k] = process.env[k];
    process.env[k] = v;
  }
  // Reset provider singletons aren't cached — getRoutingProvider reads env each call.

  console.log(`\n=== ${label} ===`);
  const result = await runProspectSearch({
    provinceCode: "ON",
    startQuery: "M5V 2T6",
    dailyVisitTarget: 20,
    maxRadiusKm: 40,
    maxDriveMinutes: 60,
    dayStartClock: "09:00",
    dayEndClock: "17:00",
    minFitScore: 3,
    alreadyVisitedRaw: "none",
    revisitsDueRaw: "none",
  });

  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  if (!result.ok) {
    console.error("FAIL", result.error);
    return false;
  }

  const s = result.routeSummary!;
  console.log(
    JSON.stringify(
      {
        placesProvider: result.placesProvider,
        routingProvider: result.routingProvider,
        discovery: result.discovery.discoveredCount,
        qualifiedRouted: result.qualifiedCount,
        stopCount: s.stopCount,
        target: s.target,
        totalDriveMinutes: s.totalDriveMinutes,
        totalVisitMinutes: s.totalVisitMinutes,
        estimatedDayMinutes: s.estimatedDayMinutes,
        trafficAware: s.trafficAware,
        driveTimeEnforced: s.driveTimeConstraintEnforced,
        driveTimeWarning: s.driveTimeConstraintWarning,
        optimization: s.optimizationEnabled,
        orderedStops: result.result.entries.slice(0, 8).map((e) => {
          const r = result.routeByAccountId[e.accountId];
          return {
            seq: r?.sequence,
            name: e.businessName.slice(0, 28),
            fit: e.fitScore,
            driveMin: r?.travelMinutesFromPrevious,
            eta: r?.arrivalClock,
            hours: r?.openingHoursState,
            geoEst: r?.durationIsGeodesicEstimate,
          };
        }),
        excludedSample: s.excludedForRouting.slice(0, 5),
        warnings: s.warnings.slice(0, 5),
      },
      null,
      2,
    ),
  );
  return result.qualifiedCount >= 0 && result.routingProvider.length > 0;
}

async function main() {
  process.env.PLACES_PROVIDER = process.env.PLACES_PROVIDER || "mock";
  process.env.CRM_PROVIDER = process.env.CRM_PROVIDER || "mock";
  process.env.LLM_PROVIDER = process.env.LLM_PROVIDER || "none";
  process.env.ENRICHMENT_MAX_ACCOUNTS = process.env.ENRICHMENT_MAX_ACCOUNTS || "5";
  process.env.ROUTING_MAX_API_CALLS = process.env.ROUTING_MAX_API_CALLS || "2000";
  process.env.ROUTING_MAX_CANDIDATES = process.env.ROUTING_MAX_CANDIDATES || "40";

  const a = await runMode("mock routing", {
    ROUTING_PROVIDER: "mock",
    ROUTE_OPTIMIZATION_ENABLED: "true",
  });
  const b = await runMode("geodesic + hard drive-time (must warn, not fake-enforce)", {
    ROUTING_PROVIDER: "geodesic",
    ROUTE_OPTIMIZATION_ENABLED: "true",
  });

  process.env.ROUTING_PROVIDER = "geodesic";
  process.env.ROUTE_OPTIMIZATION_ENABLED = "true";
  console.log(`\n=== geodesic order (no drive-time cap) ===`);
  const geoOrder = await runProspectSearch({
    provinceCode: "ON",
    startQuery: "M5V 2T6",
    dailyVisitTarget: 20,
    maxRadiusKm: 40,
    maxDriveMinutes: null,
    dayStartClock: "09:00",
    dayEndClock: "17:00",
    minFitScore: 3,
    alreadyVisitedRaw: "none",
    revisitsDueRaw: "none",
  });
  const c = Boolean(
    geoOrder.ok &&
      geoOrder.routingProvider === "geodesic" &&
      geoOrder.qualifiedCount > 0 &&
      geoOrder.routeSummary?.warnings.some((w) => /geodesic/i.test(w)),
  );
  if (geoOrder.ok) {
    console.log(
      JSON.stringify(
        {
          stopCount: geoOrder.qualifiedCount,
          provider: geoOrder.routingProvider,
          sample: geoOrder.result.entries.slice(0, 5).map((e) => ({
            seq: geoOrder.routeByAccountId[e.accountId]?.sequence,
            name: e.businessName.slice(0, 24),
            geoEst: geoOrder.routeByAccountId[e.accountId]?.durationIsGeodesicEstimate,
          })),
        },
        null,
        2,
      ),
    );
  }

  console.log(
    `\nvalidate:routing — mock=${a ? "PASS" : "FAIL"} geodesicHardDrive=${b ? "PASS" : "FAIL"} geodesicOrder=${c ? "PASS" : "FAIL"}`,
  );
  process.exit(a && b && c ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
