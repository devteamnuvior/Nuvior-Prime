/**
 * Phase 8 routing / optimization tests — no live Google credentials.
 */

import { describe, expect, it } from "vitest";
import {
  GeodesicRoutingProvider,
  MockRoutingProvider,
} from "@/providers/routing/types";
import { planVisitRoute } from "@/domain/routing/optimize";
import { assessOpeningHours, suggestDropIn } from "@/domain/routing/openingHours";
import { getRoutingConfig, type RoutingConfig } from "@/domain/routing/config";
import { buildDailyVisitList, type ProspectCandidate } from "@/domain/visitList";
import type { VisitListEntry } from "@/domain/visitList";
import { qualifyAccount } from "@/domain/qualification";

const baseCfg = (): RoutingConfig => ({
  ...getRoutingConfig(),
  optimizationEnabled: true,
  provider: "mock",
  maxCandidates: 20,
  maxApiCalls: 100,
  allowGeodesicFallback: true,
  lunchEnabled: true,
  lunchStartMinutes: 12 * 60,
  lunchEndMinutes: 14 * 60,
  defaultVisitMinutes: 20,
  revisitVisitMinutes: 25,
  weightFit: 12,
  weightRevisit: 40,
  weightTravelMinutes: 1,
  weightSchedulePenalty: 2,
  trafficMode: "traffic_unaware",
});

const start = { lat: 43.6426, lng: -79.3871 }; // M5V-ish

function entry(
  partial: Partial<VisitListEntry> & Pick<VisitListEntry, "accountId" | "businessName" | "fitScore">,
): VisitListEntry {
  return {
    segmentNumber: 1,
    categoryNumber: 1,
    categoryLabel: "Medical aesthetic clinic",
    organizationTypeLabel: "Independent",
    streetAddress: "1 Test St",
    city: "Toronto",
    provinceCode: "ON",
    postalCode: "M5V 1A1",
    postalCodePrefix: "M5V",
    distanceKm: 5,
    isRevisit: false,
    leadProduct: "DERMACEUTIC",
    leadProductLabel: "Dermaceutic",
    openingAngle: "test",
    certificationPathwayFit: "THREE_LEVEL",
    needsManualVerification: false,
    googleMapsUrl: null,
    qualification: qualifyAccount({
      businessName: partial.businessName,
      provinceCode: "ON",
      segmentNumber: 1,
      categoryNumber: 1,
      categoryLabel: "Medical aesthetic clinic",
      organizationTypeLabel: "Independent",
      credentials: {
        hasPhysicianOrNp: true,
        hasRn: false,
        hasNd: false,
        hasImg: false,
        hasAllied: false,
        physicianOrNpOnSiteForPrp: true,
        rnHasPhysicianDirective: false,
      },
      advertisesThreadLifting: false,
      pricePositioning: "mid",
      formerMesoesteticCustomer: false,
      doNotContact: false,
      hasAcademyAccount: null,
      aptosPathway: "NONE",
      aptosCertificationLevel: null,
      injectablesOffered: "tox",
      threadsOffered: "UNKNOWN, verify",
      skincareLines: "x",
    }),
    ...partial,
  };
}

describe("routing providers", () => {
  it("geodesic never claims drive duration", async () => {
    const g = new GeodesicRoutingProvider();
    const leg = await g.distanceBetween(start, { lat: 43.65, lng: -79.38 });
    expect(leg.mode).toBe("geodesic");
    expect(leg.durationMinutes).toBeNull();
  });

  it("mock returns driving duration", async () => {
    const m = new MockRoutingProvider();
    const leg = await m.distanceBetween(start, { lat: 43.65, lng: -79.38 });
    expect(leg.mode).toBe("driving");
    expect(leg.durationMinutes).toBeGreaterThan(0);
  });

  it("mock outage falls back without inventing drive time", async () => {
    const m = new MockRoutingProvider(true);
    const leg = await m.distanceBetween(start, { lat: 43.65, lng: -79.38 });
    expect(leg.fallback).toBe("unavailable");
    expect(leg.durationMinutes).toBeNull();
  });
});

describe("opening hours", () => {
  const monday = new Date(2026, 7, 31); // local Monday
  it("unknown hours", () => {
    const a = assessOpeningHours(null, monday, baseCfg());
    expect(a.state).toBe("unknown");
    expect(a.label).toContain("UNKNOWN");
  });

  it("closed today", () => {
    const a = assessOpeningHours({ byDay: { "1": [] } }, monday, baseCfg());
    // Aug 31 2026 is Monday = 1
    expect(a.state).toBe("closed");
  });

  it("suggests drop-in avoiding first hour and lunch", () => {
    const s = suggestDropIn([{ openMinutes: 9 * 60, closeMinutes: 17 * 60 }], baseCfg());
    expect(s).toContain("Suggested drop-in window");
    expect(s).not.toContain("Appointment confirmed");
  });
});

describe("route optimization", () => {
  it("prioritizes revisit and higher fit", async () => {
    const pool = [
      entry({
        accountId: "a-low",
        businessName: "Low Fit Near",
        fitScore: 3,
        distanceKm: 1,
      }),
      entry({
        accountId: "a-high",
        businessName: "High Fit Farther",
        fitScore: 5,
        distanceKm: 8,
      }),
      entry({
        accountId: "a-rev",
        businessName: "Revisit Mid",
        fitScore: 3,
        distanceKm: 6,
        isRevisit: true,
      }),
    ];
    const coords = {
      "a-low": { lat: 43.643, lng: -79.387 },
      "a-high": { lat: 43.7, lng: -79.4 },
      "a-rev": { lat: 43.66, lng: -79.39 },
    };
    const plan = await planVisitRoute({
      startPoint: start,
      qualifiedPool: pool,
      coordsByAccountId: coords,
      openingHoursByAccountId: {},
      dailyVisitTarget: 2,
      maxRadiusKm: 40,
      maxDriveMinutes: null,
      routing: new MockRoutingProvider(),
      config: baseCfg(),
    });
    expect(plan.stops[0]!.accountId).toBe("a-rev");
    expect(plan.stops.map((s) => s.accountId)).toContain("a-high");
  });

  it("enforces max drive time with mock routing", async () => {
    const pool = [
      entry({
        accountId: "near",
        businessName: "Near",
        fitScore: 4,
        distanceKm: 2,
      }),
      entry({
        accountId: "far",
        businessName: "Far",
        fitScore: 5,
        distanceKm: 35,
      }),
    ];
    const plan = await planVisitRoute({
      startPoint: start,
      qualifiedPool: pool,
      coordsByAccountId: {
        near: { lat: 43.645, lng: -79.388 },
        far: { lat: 44.0, lng: -79.5 },
      },
      openingHoursByAccountId: {},
      dailyVisitTarget: 5,
      maxRadiusKm: 80,
      maxDriveMinutes: 15,
      routing: new MockRoutingProvider(),
      config: baseCfg(),
    });
    expect(plan.summary.driveTimeConstraintEnforced).toBe(true);
    expect(plan.stops.every((s) => s.accountId !== "far" || (s.travelMinutesFromPrevious ?? 0) <= 15)).toBe(
      true,
    );
    expect(
      plan.summary.excludedForRouting.some((e) => e.reason.includes("outside max drive time")),
    ).toBe(true);
  });

  it("does not falsely enforce drive-time on geodesic", async () => {
    const pool = [
      entry({ accountId: "x", businessName: "X", fitScore: 4, distanceKm: 5 }),
    ];
    const plan = await planVisitRoute({
      startPoint: start,
      qualifiedPool: pool,
      coordsByAccountId: { x: { lat: 43.65, lng: -79.38 } },
      openingHoursByAccountId: {},
      dailyVisitTarget: 5,
      maxRadiusKm: 40,
      maxDriveMinutes: 60,
      routing: new GeodesicRoutingProvider(),
      config: { ...baseCfg(), allowGeodesicFallback: true },
    });
    expect(plan.summary.driveTimeConstraintEnforced).toBe(false);
    expect(plan.summary.driveTimeConstraintWarning).toBeTruthy();
    expect(plan.stops.length).toBe(0);
  });

  it("excludes closed clinics", async () => {
    const monday = new Date(2026, 7, 31);
    const pool = [
      entry({ accountId: "closed", businessName: "Closed", fitScore: 5, distanceKm: 2 }),
      entry({ accountId: "open", businessName: "Open", fitScore: 4, distanceKm: 3 }),
    ];
    const plan = await planVisitRoute({
      startPoint: start,
      qualifiedPool: pool,
      coordsByAccountId: {
        closed: { lat: 43.644, lng: -79.386 },
        open: { lat: 43.646, lng: -79.385 },
      },
      openingHoursByAccountId: {
        closed: { byDay: { "1": [] } },
        open: { byDay: { "1": [{ open: "09:00", close: "17:00" }] } },
      },
      dailyVisitTarget: 5,
      maxRadiusKm: 40,
      maxDriveMinutes: null,
      runDate: monday,
      routing: new MockRoutingProvider(),
      config: baseCfg(),
    });
    expect(plan.stops.every((s) => s.accountId !== "closed")).toBe(true);
    expect(plan.summary.excludedForRouting.some((e) => e.reason === "closed today")).toBe(true);
  });

  it("respects workday capacity", async () => {
    const pool = Array.from({ length: 8 }, (_, i) =>
      entry({
        accountId: `s${i}`,
        businessName: `Stop ${i}`,
        fitScore: 4,
        distanceKm: 2 + i,
      }),
    );
    const coords = Object.fromEntries(
      pool.map((p, i) => [p.accountId, { lat: 43.64 + i * 0.01, lng: -79.387 }]),
    );
    const plan = await planVisitRoute({
      startPoint: start,
      qualifiedPool: pool,
      coordsByAccountId: coords,
      openingHoursByAccountId: {},
      dailyVisitTarget: 20,
      maxRadiusKm: 40,
      maxDriveMinutes: null,
      dayStartClock: "16:00",
      dayEndClock: "17:00",
      routing: new MockRoutingProvider(),
      config: { ...baseCfg(), defaultVisitMinutes: 25 },
    });
    expect(plan.stops.length).toBeLessThan(8);
    expect(
      plan.summary.scheduleCapacityExhausted ||
        plan.summary.excludedForRouting.some((e) => e.reason.includes("workday")),
    ).toBe(true);
  });

  it("legacy mode preserves nearest order when optimization off", async () => {
    const pool = [
      entry({ accountId: "far", businessName: "Far", fitScore: 5, distanceKm: 10 }),
      entry({ accountId: "near", businessName: "Near", fitScore: 3, distanceKm: 1 }),
    ].sort((a, b) => a.distanceKm - b.distanceKm);
    const plan = await planVisitRoute({
      startPoint: start,
      qualifiedPool: pool,
      coordsByAccountId: {
        far: { lat: 43.7, lng: -79.4 },
        near: { lat: 43.643, lng: -79.387 },
      },
      openingHoursByAccountId: {},
      dailyVisitTarget: 2,
      maxRadiusKm: 40,
      maxDriveMinutes: null,
      routing: new MockRoutingProvider(),
      config: { ...baseCfg(), optimizationEnabled: false },
    });
    expect(plan.summary.optimizationEnabled).toBe(false);
    expect(plan.stops[0]!.accountId).toBe("near");
  });

  it("marks unresolved location", async () => {
    const pool = [entry({ accountId: "missing", businessName: "Missing", fitScore: 4 })];
    const plan = await planVisitRoute({
      startPoint: start,
      qualifiedPool: pool,
      coordsByAccountId: {},
      openingHoursByAccountId: {},
      dailyVisitTarget: 5,
      maxRadiusKm: 40,
      maxDriveMinutes: null,
      routing: new MockRoutingProvider(),
      config: baseCfg(),
    });
    expect(plan.summary.excludedForRouting[0]!.reason).toBe("unresolved location");
  });
});

describe("qualification still authoritative before routing", () => {
  it("DNC never enters qualified pool", () => {
    const candidates: ProspectCandidate[] = [
      {
        id: "dnc",
        businessName: "DNC Clinic",
        parentGroupName: null,
        organizationTypeLabel: "Independent",
        segmentNumber: 1,
        categoryNumber: 1,
        categoryLabel: "Medical aesthetic clinic",
        streetAddress: "1 St",
        city: "Toronto",
        provinceCode: "ON",
        postalCode: "M5V 1A1",
        latitude: 43.64,
        longitude: -79.38,
        googleMapsUrl: null,
        placeId: "dnc",
        dataCompleteness: "needs_verification",
        qualificationInput: {
          credentials: {
            hasPhysicianOrNp: true,
            hasRn: false,
            hasNd: false,
            hasImg: false,
            hasAllied: false,
            physicianOrNpOnSiteForPrp: true,
            rnHasPhysicianDirective: false,
          },
          advertisesThreadLifting: true,
          pricePositioning: "premium",
          formerMesoesteticCustomer: false,
          doNotContact: true,
          hasAcademyAccount: null,
          aptosPathway: "NONE",
          aptosCertificationLevel: null,
          injectablesOffered: "x",
          threadsOffered: "x",
          skincareLines: "x",
        },
      },
    ];
    const result = buildDailyVisitList(
      {
        provinceCode: "ON",
        startPoint: start,
        dailyVisitTarget: 10,
        maxRadiusKm: 40,
        minFitScore: 3,
        alreadyVisitedNames: [],
        revisitNames: [],
      },
      candidates,
    );
    expect(result.qualifiedPool).toHaveLength(0);
    expect(result.excludedDoNotContact).toContain("DNC Clinic");
  });
});
