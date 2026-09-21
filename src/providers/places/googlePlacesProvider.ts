import type { GeoPoint } from "@/domain/geo";
import type {
  PlacesProvider,
  PlacesRequestStats,
  RawPlace,
  TextSearchParams,
} from "./types";
import { mapGooglePlaceToRawPlace, type GooglePlacePayload } from "./googlePlaceMapper";
import { cachedFetch } from "./placesCache";
import { resolveGoogleServerKey } from "@/lib/googleServerKey";

const PLACES_BASE = "https://places.googleapis.com/v1";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.googleMapsUri",
  "places.types",
  "places.primaryType",
  "places.rating",
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.regularOpeningHours",
].join(",");

const DETAIL_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "location",
  "googleMapsUri",
  "types",
  "primaryType",
  "rating",
  "userRatingCount",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
].join(",");

export type GooglePlacesConfig = {
  apiKey: string;
  cacheTtlSeconds: number;
  /** Max text-search HTTP calls this provider instance will make (hard stop). */
  maxSearches: number;
};

/**
 * Google Places API (New) + Geocoding API.
 * Does not invent fields; missing contact data → UNKNOWN, verify.
 */
export class GooglePlacesProvider implements PlacesProvider {
  readonly name = "google" as const;
  private stats: PlacesRequestStats = emptyStats();
  private searchCallsThisRun = 0;

  constructor(private readonly config: GooglePlacesConfig) {}

  resetRequestStats(): void {
    this.stats = emptyStats();
    this.searchCallsThisRun = 0;
  }

  getRequestStats(): PlacesRequestStats {
    return { ...this.stats, errors: [...this.stats.errors] };
  }

  async geocode(query: string, provinceCode: string): Promise<GeoPoint | null> {
    this.stats.geocodeCalls += 1;
    const address = `${query}, ${provinceCode}, Canada`;
    const cacheKey = `geocode:${address.toUpperCase()}`;

    try {
      const { payload, cacheHit } = await cachedFetch(
        cacheKey,
        this.config.cacheTtlSeconds,
        async () => {
          const url = new URL(GEOCODE_BASE);
          url.searchParams.set("address", address);
          url.searchParams.set("components", "country:CA");
          url.searchParams.set("key", this.config.apiKey);
          const res = await fetch(url.toString());
          if (!res.ok) {
            throw new Error(`Geocoding HTTP ${res.status}: ${await res.text()}`);
          }
          return res.json();
        },
        { provider: "google", endpoint: "geocode" },
      );
      if (cacheHit) this.stats.cacheHits += 1;

      const data = payload as {
        status: string;
        error_message?: string;
        results?: { geometry?: { location?: { lat: number; lng: number } } }[];
      };

      if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
        const msg = `Geocoding failed (${data.status}): ${data.error_message ?? "check API key / quota"}`;
        this.stats.errors.push(msg);
        throw new Error(msg);
      }
      if (data.status !== "OK" || !data.results?.length) return null;

      const loc = data.results[0]?.geometry?.location;
      if (!loc) return null;
      return { lat: loc.lat, lng: loc.lng };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!this.stats.errors.includes(msg)) this.stats.errors.push(msg);
      throw e;
    }
  }

  async textSearch(params: TextSearchParams): Promise<RawPlace[]> {
    if (this.searchCallsThisRun >= this.config.maxSearches) {
      const msg = `Google Places search budget reached (${this.config.maxSearches} text searches per run)`;
      this.stats.errors.push(msg);
      return [];
    }

    this.stats.textSearchCalls += 1;
    this.searchCallsThisRun += 1;

    const cacheKey = `text:${params.provinceCode}:${params.query}:${params.origin.lat.toFixed(4)},${params.origin.lng.toFixed(4)}:${params.radiusKm}`;

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[places:google] textSearch #${this.searchCallsThisRun} q="${params.query}" r=${params.radiusKm}km`,
      );
    }

    try {
      const { payload, cacheHit } = await cachedFetch(
        cacheKey,
        this.config.cacheTtlSeconds,
        async () => {
          const res = await fetch(`${PLACES_BASE}/places:searchText`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": this.config.apiKey,
              "X-Goog-FieldMask": SEARCH_FIELD_MASK,
            },
            body: JSON.stringify({
              textQuery: `${params.query} ${params.provinceCode} Canada`,
              pageSize: 10,
              regionCode: "CA",
              locationBias: {
                circle: {
                  center: {
                    latitude: params.origin.lat,
                    longitude: params.origin.lng,
                  },
                  radius: Math.min(params.radiusKm * 1000, 50000),
                },
              },
            }),
          });

          if (res.status === 401 || res.status === 403) {
            throw new Error(
              `Google Places auth/quota error HTTP ${res.status}. Check GOOGLE_PLACES_API_KEY and that Places API (New) is enabled.`,
            );
          }
          if (res.status === 429) {
            throw new Error("Google Places rate limit (429). Try again later or lower max searches.");
          }
          if (!res.ok) {
            throw new Error(`Google Places textSearch HTTP ${res.status}: ${await res.text()}`);
          }
          return res.json();
        },
        { provider: "google", endpoint: "searchText" },
      );
      if (cacheHit) this.stats.cacheHits += 1;

      const data = payload as { places?: GooglePlacePayload[] };
      const places: RawPlace[] = [];
      for (const p of data.places ?? []) {
        const mapped = mapGooglePlaceToRawPlace(p, {
          provider: "google",
          provinceCode: params.provinceCode,
          signal: params.signal,
        });
        if (mapped) places.push(mapped);
      }
      return places;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.stats.errors.push(msg);
      throw e;
    }
  }

  async getPlaceDetails(placeId: string, provinceCode: string): Promise<RawPlace | null> {
    this.stats.detailCalls += 1;
    const cacheKey = `detail:${placeId}`;

    if (process.env.NODE_ENV === "development") {
      console.info(`[places:google] placeDetails ${placeId}`);
    }

    try {
      const { payload, cacheHit } = await cachedFetch(
        cacheKey,
        this.config.cacheTtlSeconds,
        async () => {
          const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
            method: "GET",
            headers: {
              "X-Goog-Api-Key": this.config.apiKey,
              "X-Goog-FieldMask": DETAIL_FIELD_MASK,
            },
          });
          if (res.status === 401 || res.status === 403) {
            throw new Error(
              `Google Places auth/quota error HTTP ${res.status} on Place Details.`,
            );
          }
          if (!res.ok) {
            throw new Error(`Google Places details HTTP ${res.status}: ${await res.text()}`);
          }
          return res.json();
        },
        { provider: "google", endpoint: "placeDetails", providerRecordId: placeId },
      );
      if (cacheHit) this.stats.cacheHits += 1;

      return mapGooglePlaceToRawPlace(payload as GooglePlacePayload, {
        provider: "google",
        provinceCode,
        signal: "place_details",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.stats.errors.push(msg);
      throw e;
    }
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

export function createGooglePlacesProviderFromEnv(): GooglePlacesProvider | null {
  const apiKey = resolveGoogleServerKey();
  if (!apiKey) return null;
  return new GooglePlacesProvider({
    apiKey,
    cacheTtlSeconds: Number(process.env.GOOGLE_PLACES_CACHE_TTL_SECONDS ?? 86400),
    maxSearches: Number(process.env.GOOGLE_PLACES_MAX_SEARCHES_PER_RUN ?? 24),
  });
}
