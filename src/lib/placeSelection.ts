/**
 * Normalization of a browser-selected Google Place into the planner's
 * start-location contract. Pure — testable without Google globals.
 */

export type SelectedAddressComponent = {
  longText?: string | null;
  shortText?: string | null;
  types: string[];
};

export type StartSelection = {
  lat: number;
  lng: number;
  /** Google Place ID when the start came from Places; null for pin/geolocation. */
  placeId: string | null;
  label: string;
  provinceCode: string | null;
  postalCode: string | null;
  source: "search" | "geolocation" | "map-pin";
};

/**
 * Build a StartSelection from structured Google Place fields.
 * Uses address components — never parses the formatted address string.
 */
export function normalizeSelectedPlace(input: {
  placeId: string;
  formattedAddress: string | null | undefined;
  lat: number;
  lng: number;
  addressComponents: SelectedAddressComponent[] | null | undefined;
}): StartSelection {
  const components = input.addressComponents ?? [];
  const find = (type: string) => components.find((c) => c.types.includes(type));

  const province = find("administrative_area_level_1");
  const postal = find("postal_code");

  return {
    lat: input.lat,
    lng: input.lng,
    placeId: input.placeId,
    label: input.formattedAddress?.trim() || `${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}`,
    provinceCode: province?.shortText?.toUpperCase() ?? null,
    postalCode: postal?.longText ?? postal?.shortText ?? null,
    source: "search",
  };
}

export function pinSelection(lat: number, lng: number): StartSelection {
  return {
    lat,
    lng,
    placeId: null,
    label: `Dropped pin (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    provinceCode: null,
    postalCode: null,
    source: "map-pin",
  };
}

export function geolocationSelection(lat: number, lng: number): StartSelection {
  return {
    lat,
    lng,
    placeId: null,
    label: `My location (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    provinceCode: null,
    postalCode: null,
    source: "geolocation",
  };
}

/** Apply a human-readable reverse-geocode (or Places) result onto a start. */
export function applyGeocodeToStart(
  base: StartSelection,
  input: {
    formattedAddress?: string | null;
    provinceCode?: string | null;
    postalCode?: string | null;
  },
): StartSelection {
  const label = input.formattedAddress?.trim();
  return {
    ...base,
    label: label && label.length > 0 ? label : base.label,
    provinceCode: input.provinceCode ?? base.provinceCode,
    postalCode: input.postalCode ?? base.postalCode,
  };
}

export function provinceFromAddressComponents(
  components: { types: string[]; short_name?: string; shortText?: string; long_name?: string; longText?: string }[],
): { provinceCode: string | null; postalCode: string | null } {
  const find = (type: string) => components.find((c) => c.types.includes(type));
  const province = find("administrative_area_level_1");
  const postal = find("postal_code");
  return {
    provinceCode: (province?.shortText ?? province?.short_name)?.toUpperCase() ?? null,
    postalCode: postal?.longText ?? postal?.long_name ?? postal?.shortText ?? postal?.short_name ?? null,
  };
}

export { GEOLOCATION_UNAVAILABLE_MESSAGE } from "./browserGeolocation";

/** True when Places API (New) AutocompleteSuggestion is actually loadable. */
export function placesAutocompleteIsAvailable(places: {
  AutocompleteSuggestion?: { fetchAutocompleteSuggestions?: unknown };
} | null): boolean {
  return typeof places?.AutocompleteSuggestion?.fetchAutocompleteSuggestions === "function";
}

export type GeocoderResultLike = {
  place_id?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: () => number; lng: () => number } };
  address_components?: { types: string[]; short_name?: string; long_name?: string }[];
};

/** Maps JS Geocoder result → StartSelection. Used when Places Autocomplete is unavailable. */
export function startFromGeocoderResult(result: GeocoderResultLike): StartSelection | null {
  const loc = result.geometry?.location;
  if (!loc) return null;
  const parsed = provinceFromAddressComponents(result.address_components ?? []);
  return {
    lat: loc.lat(),
    lng: loc.lng(),
    placeId: result.place_id ?? null,
    label: result.formatted_address?.trim() || `${loc.lat().toFixed(5)}, ${loc.lng().toFixed(5)}`,
    provinceCode: parsed.provinceCode,
    postalCode: parsed.postalCode,
    source: "search",
  };
}

/** Show "Use this address" whenever the user typed a query without a resolved start. */
export function canCommitTypedStart(startText: string, start: StartSelection | null): boolean {
  return startText.trim().length >= 2 && !start;
}
