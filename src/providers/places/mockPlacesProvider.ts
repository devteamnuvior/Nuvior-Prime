import { haversineKm, type GeoPoint } from "@/domain/geo";
import type {
  PlacesProvider,
  PlacesRequestStats,
  RawPlace,
  TextSearchParams,
} from "./types";
import { MOCK_PLACES, MOCK_GEOCODES } from "./mockData";

/**
 * Mock Places provider — Phase 1 fixtures, Phase 2-compatible contract.
 * Synthetic engineering data only (sourceType MOCK).
 */
export class MockPlacesProvider implements PlacesProvider {
  readonly name = "mock" as const;
  private stats: PlacesRequestStats = emptyStats();

  resetRequestStats(): void {
    this.stats = emptyStats();
  }

  getRequestStats(): PlacesRequestStats {
    return { ...this.stats, errors: [...this.stats.errors] };
  }

  async geocode(query: string, provinceCode: string): Promise<GeoPoint | null> {
    this.stats.geocodeCalls += 1;
    const key = `${provinceCode}|${query.trim().toUpperCase()}`;
    const direct = MOCK_GEOCODES[key];
    if (direct) return direct;

    const loose = Object.entries(MOCK_GEOCODES).find(([k]) =>
      k.startsWith(`${provinceCode}|`) &&
      (k.includes(query.trim().toUpperCase()) ||
        query.trim().toUpperCase().includes(k.split("|")[1] ?? "")),
    );
    return loose?.[1] ?? null;
  }

  async textSearch(params: TextSearchParams): Promise<RawPlace[]> {
    this.stats.textSearchCalls += 1;
    const q = params.query.toLowerCase();

    return MOCK_PLACES.filter((p) => {
      if (p.provinceCode !== params.provinceCode) return false;
      const d = haversineKm(params.origin, { lat: p.latitude, lng: p.longitude });
      if (d > params.radiusKm) return false;
      // Loose mock matching: always include places in radius for taxonomy/clinic-ish queries,
      // otherwise match name/types/signals to query tokens.
      const hay = `${p.businessName} ${p.primaryType} ${p.googleTypes.join(" ")} ${p.discoverySignals.join(" ")}`.toLowerCase();
      const tokens = q.split(/\s+/).filter((t) => t.length > 3);
      if (tokens.length === 0) return true;
      const hit = tokens.some((t) => hay.includes(t));
      // Ensure progressive discovery still finds the fixture set for common clinic queries
      if (/clinic|spa|dermat|medical|aesthetic|prp|peel|boutique|surgery|injector|thread|skin/.test(q)) {
        return true;
      }
      return hit;
    }).map((p) => ({
      ...p,
      discoverySignals: [...new Set([...p.discoverySignals, params.signal])],
      fetchedAt: new Date().toISOString(),
    }));
  }

  async getPlaceDetails(placeId: string): Promise<RawPlace | null> {
    this.stats.detailCalls += 1;
    return MOCK_PLACES.find((p) => p.placeId === placeId) ?? null;
  }
}

function emptyStats(): PlacesRequestStats {
  return {
    geocodeCalls: 0,
    textSearchCalls: 0,
    detailCalls: 0,
    cacheHits: 0,
    errors: [],
  };
}
