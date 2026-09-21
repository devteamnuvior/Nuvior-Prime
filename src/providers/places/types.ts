import type { GeoPoint } from "@/domain/geo";
import { UNKNOWN_VERIFY } from "@/domain/terminology";

/** Provenance for a single researched field from an external provider. */
export type FieldProvenance = {
  provider: string;
  providerRecordId: string;
  fetchedAt: string; // ISO
  sourceUrl: string | null;
  needsVerification: boolean;
  confidence: "high" | "medium" | "low" | null;
};

/**
 * Place evidence from a Places provider — no NUVIOR taxonomy.
 * Taxonomy is assigned by the domain classifier (Phase 2).
 */
export type RawPlace = {
  placeId: string;
  businessName: string;
  streetAddress: string;
  unitSuite: string | null;
  city: string;
  provinceCode: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string | null;
  mainPhone: string;
  website: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  openingHoursJson: unknown | null;
  /** Google Places types — evidence only, never the NUVIOR taxonomy. */
  googleTypes: string[];
  primaryType: string | null;
  /** Which focused search queries / keyword groups found this place. */
  discoverySignals: string[];
  provider: "mock" | "google";
  fetchedAt: string;
  fieldProvenance: Partial<Record<keyof RawPlace | string, FieldProvenance>>;
};

export type TextSearchParams = {
  query: string;
  origin: GeoPoint;
  radiusKm: number;
  provinceCode: string;
  /** Tag attached to results as a discovery signal. */
  signal: string;
};

export type PlacesRequestStats = {
  geocodeCalls: number;
  textSearchCalls: number;
  detailCalls: number;
  cacheHits: number;
  errors: string[];
};

export interface PlacesProvider {
  readonly name: "mock" | "google";
  geocode(query: string, provinceCode: string): Promise<GeoPoint | null>;
  /**
   * Keyword / category text search biased to a circle around origin.
   * Must not invent fields; use UNKNOWN, verify for missing contact data.
   */
  textSearch(params: TextSearchParams): Promise<RawPlace[]>;
  /** Optional expensive detail fetch — only after dedupe. */
  getPlaceDetails?(placeId: string, provinceCode: string): Promise<RawPlace | null>;
  getRequestStats(): PlacesRequestStats;
  resetRequestStats(): void;
}

export function emptyProvenance(
  provider: string,
  placeId: string,
  needsVerification = true,
): FieldProvenance {
  return {
    provider,
    providerRecordId: placeId,
    fetchedAt: new Date().toISOString(),
    sourceUrl: placeId ? `https://maps.google.com/?q=place_id:${placeId}` : null,
    needsVerification,
    confidence: null,
  };
}

export function unknownContact(): string {
  return UNKNOWN_VERIFY;
}
