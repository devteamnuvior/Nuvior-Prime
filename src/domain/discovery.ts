/**
 * Discovery utilities: dedupe + progressive search orchestration.
 * Geographic discovery only — qualification stays in visitList/qualification.
 */

import { haversineKm, type GeoPoint } from "./geo";
import { radiusRingsUpTo, selectFocusedQueries } from "./searchQueries";
import { classifyPlace } from "./classifyPlace";
import type { PlacesProvider, RawPlace } from "@/providers/places/types";
import type { ClassificationResult } from "./classifyPlace";

export type DiscoveredCandidate = {
  place: RawPlace;
  classification: ClassificationResult;
  distanceKm: number;
};

export type DiscoveryStats = {
  provider: string;
  discoveredCount: number;
  afterDedupCount: number;
  classifiedInTaxonomyCount: number;
  radiusReachedKm: number;
  textSearchCalls: number;
  detailCalls: number;
  geocodeCalls: number;
  cacheHits: number;
  ringsSearched: number[];
  queriesUsed: number;
  stoppedReason: "target_met" | "radius_exhausted" | "search_budget" | "provider_error";
  errors: string[];
};

export type DiscoveryOptions = {
  origin: GeoPoint;
  provinceCode: string;
  maxRadiusKm: number;
  /** Soft hint for how many places to gather before qualifying (not visit target). */
  discoveryTargetHint: number;
  maxSearchesPerRun: number;
  fetchDetails: boolean;
  /** When true, stop expanding rings once we have enough in-taxonomy candidates near target. */
  earlyStopOnCandidateVolume: boolean;
};

export function normalizeBusinessKey(name: string, address: string): string {
  return `${name}|${address}`
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupePlaces(places: RawPlace[]): RawPlace[] {
  const byId = new Map<string, RawPlace>();
  const byKey = new Map<string, string>(); // key → placeId

  for (const place of places) {
    const existingById = byId.get(place.placeId);
    if (existingById) {
      byId.set(place.placeId, mergePlaces(existingById, place));
      continue;
    }

    const key = normalizeBusinessKey(place.businessName, place.streetAddress);
    const priorId = byKey.get(key);
    if (priorId) {
      const prior = byId.get(priorId)!;
      byId.set(priorId, mergePlaces(prior, place));
      continue;
    }

    byId.set(place.placeId, place);
    byKey.set(key, place.placeId);
  }

  return [...byId.values()];
}

function mergePlaces(a: RawPlace, b: RawPlace): RawPlace {
  const signals = [...new Set([...a.discoverySignals, ...b.discoverySignals])];
  const types = [...new Set([...a.googleTypes, ...b.googleTypes])];
  return {
    ...a,
    discoverySignals: signals,
    googleTypes: types,
    mainPhone: preferKnown(a.mainPhone, b.mainPhone),
    website: a.website ?? b.website,
    googleMapsUrl: a.googleMapsUrl ?? b.googleMapsUrl,
    googleRating: a.googleRating ?? b.googleRating,
    googleReviewCount: a.googleReviewCount ?? b.googleReviewCount,
    openingHoursJson: a.openingHoursJson ?? b.openingHoursJson,
    postalCode: preferKnown(a.postalCode, b.postalCode),
    city: preferKnown(a.city, b.city),
    fieldProvenance: { ...a.fieldProvenance, ...b.fieldProvenance },
  };
}

function preferKnown(a: string, b: string): string {
  if (a && a !== "UNKNOWN, verify") return a;
  if (b && b !== "UNKNOWN, verify") return b;
  return a || b || "UNKNOWN, verify";
}

export async function discoverPlaces(
  provider: PlacesProvider,
  options: DiscoveryOptions,
): Promise<{ candidates: DiscoveredCandidate[]; stats: DiscoveryStats }> {
  provider.resetRequestStats();
  const rings = radiusRingsUpTo(options.maxRadiusKm);
  const errors: string[] = [];
  let all: RawPlace[] = [];
  let queriesUsed = 0;
  let stoppedReason: DiscoveryStats["stoppedReason"] = "radius_exhausted";
  let radiusReachedKm = 0;
  const ringsSearched: number[] = [];

  // Leave headroom for multiple rings: ~half the budget per ring's query set size
  const queriesPerRing = Math.max(
    4,
    Math.min(12, Math.floor(options.maxSearchesPerRun / Math.max(rings.length, 1))),
  );
  const queries = selectFocusedQueries(queriesPerRing);

  try {
    for (const radiusKm of rings) {
      radiusReachedKm = radiusKm;
      ringsSearched.push(radiusKm);

      for (const q of queries) {
        if (queriesUsed >= options.maxSearchesPerRun) {
          stoppedReason = "search_budget";
          break;
        }
        queriesUsed += 1;
        try {
          const batch = await provider.textSearch({
            query: q.query,
            origin: options.origin,
            radiusKm,
            provinceCode: options.provinceCode,
            signal: q.signal,
          });
          all = all.concat(batch);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(msg);
          stoppedReason = "provider_error";
          break;
        }
      }

      if (stoppedReason === "search_budget" || stoppedReason === "provider_error") break;

      const deduped = dedupePlaces(all);
      const inTaxonomyNear = deduped.filter((p) => {
        const d = haversineKm(options.origin, { lat: p.latitude, lng: p.longitude });
        if (d > radiusKm) return false;
        return classifyPlace(p).inTaxonomy;
      });

      // Soft early-stop: enough raw in-taxonomy candidates to likely fill visit target after qualify
      if (
        options.earlyStopOnCandidateVolume &&
        inTaxonomyNear.length >= options.discoveryTargetHint * 2
      ) {
        stoppedReason = "target_met";
        break;
      }

      if (radiusKm >= options.maxRadiusKm) {
        stoppedReason = "radius_exhausted";
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    stoppedReason = "provider_error";
  }

  let deduped = dedupePlaces(all).filter((p) => {
    const d = haversineKm(options.origin, { lat: p.latitude, lng: p.longitude });
    return d <= options.maxRadiusKm && p.provinceCode === options.provinceCode;
  });

  // Detail fetch only after dedupe, and only when enabled
  if (options.fetchDetails && provider.getPlaceDetails) {
    const enriched: RawPlace[] = [];
    for (const p of deduped) {
      try {
        const detail = await provider.getPlaceDetails(p.placeId, options.provinceCode);
        enriched.push(detail ? mergePlaces(p, detail) : p);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
        enriched.push(p);
      }
    }
    deduped = enriched;
  }

  const candidates: DiscoveredCandidate[] = deduped
    .map((place) => {
      const classification = classifyPlace(place);
      const distanceKm = haversineKm(options.origin, {
        lat: place.latitude,
        lng: place.longitude,
      });
      return { place, classification, distanceKm };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const req = provider.getRequestStats();
  const stats: DiscoveryStats = {
    provider: provider.name,
    discoveredCount: all.length,
    afterDedupCount: deduped.length,
    classifiedInTaxonomyCount: candidates.filter((c) => c.classification.inTaxonomy).length,
    radiusReachedKm,
    textSearchCalls: req.textSearchCalls,
    detailCalls: req.detailCalls,
    geocodeCalls: req.geocodeCalls,
    cacheHits: req.cacheHits,
    ringsSearched,
    queriesUsed,
    stoppedReason,
    errors: [...errors, ...req.errors],
  };

  return { candidates, stats };
}
