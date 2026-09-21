/**
 * Phase 2 discovery / Places tests.
 * Google HTTP is never called — providers are mocked.
 */

import { describe, expect, it } from "vitest";
import { dedupePlaces, discoverPlaces, normalizeBusinessKey } from "@/domain/discovery";
import { classifyPlace } from "@/domain/classifyPlace";
import { radiusRingsUpTo, selectFocusedQueries } from "@/domain/searchQueries";
import { mapGooglePlaceToRawPlace } from "@/providers/places/googlePlaceMapper";
import { MockPlacesProvider } from "@/providers/places/mockPlacesProvider";
import type { PlacesProvider, PlacesRequestStats, RawPlace, TextSearchParams } from "@/providers/places/types";
import { emptyProvenance, unknownContact } from "@/providers/places/types";
import { qualifyAccount } from "@/domain/qualification";
import { runProspectSearch } from "@/lib/prospecting";
import type { GeoPoint } from "@/domain/geo";

function raw(partial: Partial<RawPlace> & Pick<RawPlace, "placeId" | "businessName" | "latitude" | "longitude">): RawPlace {
  const placeId = partial.placeId;
  return {
    streetAddress: partial.streetAddress ?? "1 Test St",
    unitSuite: null,
    city: partial.city ?? "Toronto",
    provinceCode: partial.provinceCode ?? "ON",
    postalCode: partial.postalCode ?? "M5V 1A1",
    googleMapsUrl: null,
    mainPhone: unknownContact(),
    website: null,
    googleRating: null,
    googleReviewCount: null,
    openingHoursJson: null,
    googleTypes: partial.googleTypes ?? [],
    primaryType: partial.primaryType ?? null,
    discoverySignals: partial.discoverySignals ?? [],
    provider: "mock",
    fetchedAt: new Date().toISOString(),
    fieldProvenance: { businessName: emptyProvenance("mock", placeId) },
    ...partial,
  };
}

describe("Places provider interface (mock)", () => {
  it("geocodes and text-searches without Google", async () => {
    const provider = new MockPlacesProvider();
    const origin = await provider.geocode("M5V 2T6", "ON");
    expect(origin).toEqual({ lat: 43.6426, lng: -79.3871 });
    const results = await provider.textSearch({
      query: "medical aesthetics clinic",
      origin: origin!,
      radiusKm: 40,
      provinceCode: "ON",
      signal: "Aptos threads",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.provider === "mock")).toBe(true);
    expect(provider.getRequestStats().textSearchCalls).toBe(1);
  });
});

describe("deduplication", () => {
  it("dedupes by place ID and merges discovery signals", () => {
    const a = raw({
      placeId: "p1",
      businessName: "Alpha Clinic",
      latitude: 43.65,
      longitude: -79.38,
      discoverySignals: ["Aptos threads"],
    });
    const b = raw({
      placeId: "p1",
      businessName: "Alpha Clinic",
      latitude: 43.65,
      longitude: -79.38,
      discoverySignals: ["Dermaceutic"],
      mainPhone: "416-555-0100",
    });
    const out = dedupePlaces([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]!.discoverySignals.sort()).toEqual(["Aptos threads", "Dermaceutic"]);
    expect(out[0]!.mainPhone).toBe("416-555-0100");
  });

  it("dedupes duplicate businesses from multiple keyword searches by name+address", () => {
    const a = raw({
      placeId: "id-a",
      businessName: "Same Clinic",
      streetAddress: "100 King St",
      latitude: 43.65,
      longitude: -79.38,
      discoverySignals: ["Aptos threads"],
    });
    const b = raw({
      placeId: "id-b",
      businessName: "Same Clinic",
      streetAddress: "100 King St",
      latitude: 43.65,
      longitude: -79.38,
      discoverySignals: ["Mesoestetic"],
    });
    expect(normalizeBusinessKey(a.businessName, a.streetAddress)).toBe(
      normalizeBusinessKey(b.businessName, b.streetAddress),
    );
    const out = dedupePlaces([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0]!.discoverySignals).toContain("Mesoestetic");
  });
});

describe("radius expansion and stopping", () => {
  it("builds progressive rings up to max radius", () => {
    expect(radiusRingsUpTo(40)).toEqual([5, 10, 20, 30, 40]);
    expect(radiusRingsUpTo(15)).toEqual([5, 10, 15]);
  });

  it("stops when search budget is exhausted", async () => {
    let calls = 0;
    const provider: PlacesProvider = {
      name: "mock",
      resetRequestStats() {},
      getRequestStats(): PlacesRequestStats {
        return { geocodeCalls: 0, textSearchCalls: calls, detailCalls: 0, cacheHits: 0, errors: [] };
      },
      async geocode() {
        return { lat: 43.64, lng: -79.38 };
      },
      async textSearch(_p: TextSearchParams) {
        calls += 1;
        return [
          raw({
            placeId: `p-${calls}`,
            businessName: `Dermatology Clinic ${calls}`,
            latitude: 43.64 + calls * 0.001,
            longitude: -79.38,
            googleTypes: ["dermatologist"],
            primaryType: "dermatologist",
            discoverySignals: [_p.signal],
            provinceCode: "ON",
          }),
        ];
      },
    };

    const { stats } = await discoverPlaces(provider, {
      origin: { lat: 43.64, lng: -79.38 },
      provinceCode: "ON",
      maxRadiusKm: 40,
      discoveryTargetHint: 100,
      maxSearchesPerRun: 3,
      fetchDetails: false,
      earlyStopOnCandidateVolume: false,
    });

    expect(stats.stoppedReason).toBe("search_budget");
    expect(stats.queriesUsed).toBe(3);
  });

  it("records radius reached when expanding to max", async () => {
    const provider = new MockPlacesProvider();
    const origin = (await provider.geocode("M5V 2T6", "ON")) as GeoPoint;
    const { stats } = await discoverPlaces(provider, {
      origin,
      provinceCode: "ON",
      maxRadiusKm: 10,
      discoveryTargetHint: 1000,
      maxSearchesPerRun: 50,
      fetchDetails: false,
      earlyStopOnCandidateVolume: false,
    });
    expect(stats.radiusReachedKm).toBe(10);
    expect(stats.ringsSearched.at(-1)).toBe(10);
  });
});

describe("unknown / missing provider fields", () => {
  it("maps missing phone/website to UNKNOWN, verify", () => {
    const place = mapGooglePlaceToRawPlace(
      {
        id: "ChIJtest",
        displayName: { text: "Test Dermatology Clinic" },
        formattedAddress: "100 Queen St W, Toronto, ON M5H 2N2, Canada",
        addressComponents: [
          { longText: "100", shortText: "100", types: ["street_number"] },
          { longText: "Queen Street West", shortText: "Queen St W", types: ["route"] },
          { longText: "Toronto", shortText: "Toronto", types: ["locality"] },
          { longText: "Ontario", shortText: "ON", types: ["administrative_area_level_1"] },
          { longText: "M5H 2N2", shortText: "M5H 2N2", types: ["postal_code"] },
        ],
        location: { latitude: 43.65, longitude: -79.38 },
        types: ["dermatologist"],
        primaryType: "dermatologist",
      },
      { provider: "google", provinceCode: "ON", signal: "Dermaceutic" },
    );
    expect(place).not.toBeNull();
    expect(place!.mainPhone).toBe("UNKNOWN, verify");
    expect(place!.website).toBeNull();
    expect(place!.fieldProvenance.mainPhone?.needsVerification).toBe(true);
    expect(place!.postalCode.toUpperCase()).toContain("M5H");
  });
});

describe("classification + Mesoestetic discovery", () => {
  it("classifies using NUVIOR taxonomy, not Google types as final labels", () => {
    const place = raw({
      placeId: "d1",
      businessName: "Downtown Dermatology Centre",
      latitude: 43.65,
      longitude: -79.38,
      googleTypes: ["doctor", "health"],
      primaryType: "doctor",
      discoverySignals: ["Dermaceutic"],
    });
    const c = classifyPlace(place);
    expect(c.inTaxonomy).toBe(true);
    expect(c.categoryLabel).toBe("Dermatology clinic, medical and/or cosmetic");
    expect(c.categoryLabel).not.toBe("doctor");
  });

  it("never recommends Mesoestetic as lead even when discovered via Mesoestetic keywords", () => {
    const result = qualifyAccount({
      businessName: "Pigment Lab Skin Studio",
      provinceCode: "ON",
      segmentNumber: 4,
      categoryNumber: 3,
      categoryLabel: "Pigmentation & melasma specialist clinic",
      organizationTypeLabel: "Independent",
      credentials: {
        hasPhysicianOrNp: false,
        hasRn: false,
        hasNd: false,
        hasImg: false,
        hasAllied: false,
        physicianOrNpOnSiteForPrp: false,
        rnHasPhysicianDirective: false,
      },
      advertisesThreadLifting: false,
      pricePositioning: "mid",
      formerMesoesteticCustomer: false,
      doNotContact: false,
      hasAcademyAccount: false,
      aptosPathway: "NONE",
      injectablesOffered: "no",
      threadsOffered: "none",
      skincareLines: "UNKNOWN, verify",
    });
    expect(result.recommendedLeadProductLabel).not.toMatch(/Mesoestetic/i);
    expect(result.recommendedLeadProduct).toBe("DERMACEUTIC");
  });
});

describe("focused queries", () => {
  it("selects a bounded priority query set", () => {
    const q = selectFocusedQueries(6);
    expect(q.length).toBe(6);
    expect(q.some((x) => x.mesoesteticDiscoveryOnly)).toBe(true);
  });
});

describe("end-to-end mock prospect search", () => {
  it("runs Toronto-shaped search on mock provider", async () => {
    process.env.PLACES_PROVIDER = "mock";
    const result = await runProspectSearch({
      provinceCode: "ON",
      startQuery: "M5V 2T6",
      dailyVisitTarget: 20,
      maxRadiusKm: 40,
      minFitScore: 3,
      alreadyVisitedRaw: "none",
      revisitsDueRaw: "none",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.placesProvider).toBe("mock");
    expect(result.discovery.afterDedupCount).toBeGreaterThan(0);
    expect(result.qualifiedCount).toBeGreaterThan(0);
    expect(result.result.entries.every((e) => e.leadProductLabel !== "Mesoestetic")).toBe(true);
  });
});
