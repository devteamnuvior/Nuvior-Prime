import { describe, expect, it } from "vitest";
import {
  GEOLOCATION_UNAVAILABLE_MESSAGE,
  applyGeocodeToStart,
  canCommitTypedStart,
  geolocationSelection,
  normalizeSelectedPlace,
  pinSelection,
  placesAutocompleteIsAvailable,
  provinceFromAddressComponents,
  startFromGeocoderResult,
} from "./placeSelection";
import { buildExternalRouteUrl } from "@/components/today/mapTypes";
import { runProspectSearch } from "@/lib/prospecting";

describe("Phase 8.6 — selected-place normalization", () => {
  it("extracts province and postal from structured address components", () => {
    const sel = normalizeSelectedPlace({
      placeId: "ChIJtest123",
      formattedAddress: "128 Spadina Ave, Toronto, ON M5V 2K7, Canada",
      lat: 43.6461,
      lng: -79.3958,
      addressComponents: [
        { longText: "128", shortText: "128", types: ["street_number"] },
        { longText: "Spadina Avenue", shortText: "Spadina Ave", types: ["route"] },
        { longText: "Toronto", shortText: "Toronto", types: ["locality", "political"] },
        {
          longText: "Ontario",
          shortText: "ON",
          types: ["administrative_area_level_1", "political"],
        },
        { longText: "M5V 2K7", shortText: "M5V 2K7", types: ["postal_code"] },
      ],
    });
    expect(sel.placeId).toBe("ChIJtest123");
    expect(sel.provinceCode).toBe("ON");
    expect(sel.postalCode).toBe("M5V 2K7");
    expect(sel.lat).toBeCloseTo(43.6461);
    expect(sel.label).toContain("Spadina");
    expect(sel.source).toBe("search");
  });

  it("degrades gracefully without address components (never parses the label)", () => {
    const sel = normalizeSelectedPlace({
      placeId: "ChIJnocomponents",
      formattedAddress: "Somewhere, ON M5V 1A1",
      lat: 43.6,
      lng: -79.4,
      addressComponents: null,
    });
    expect(sel.provinceCode).toBeNull(); // no string parsing of the address
    expect(sel.postalCode).toBeNull();
    expect(sel.placeId).toBe("ChIJnocomponents");
  });

  it("labels coordinate-only selections with exact coordinates retained", () => {
    const pin = pinSelection(43.712345678, -79.398765432);
    expect(pin.lat).toBe(43.712345678); // exact, not rounded
    expect(pin.placeId).toBeNull();
    expect(pin.source).toBe("map-pin");

    const geo = geolocationSelection(43.7, -79.4);
    expect(geo.source).toBe("geolocation");
    expect(geo.label).toMatch(/My location/);
  });

  it("applies a reverse-geocode label and province onto a geolocation start", () => {
    const raw = geolocationSelection(43.65, -79.38);
    const labeled = applyGeocodeToStart(raw, {
      formattedAddress: "King St W, Toronto, ON",
      provinceCode: "ON",
      postalCode: "M5V 1A1",
    });
    expect(labeled.source).toBe("geolocation");
    expect(labeled.label).toContain("King");
    expect(labeled.provinceCode).toBe("ON");
    expect(labeled.lat).toBe(43.65);
  });

  it("parses province from geocoder-style address components", () => {
    const p = provinceFromAddressComponents([
      { types: ["administrative_area_level_1"], short_name: "ON" },
      { types: ["postal_code"], long_name: "M5V 2T6" },
    ]);
    expect(p.provinceCode).toBe("ON");
    expect(p.postalCode).toBe("M5V 2T6");
  });

  it("detects Places Autocomplete availability without requesting geolocation", () => {
    expect(placesAutocompleteIsAvailable(null)).toBe(false);
    expect(placesAutocompleteIsAvailable({})).toBe(false);
    expect(
      placesAutocompleteIsAvailable({
        AutocompleteSuggestion: { fetchAutocompleteSuggestions: async () => ({}) },
      }),
    ).toBe(true);
  });

  it("maps a Geocoder result to a search start", () => {
    const start = startFromGeocoderResult({
      place_id: "ChIJgeo",
      formatted_address: "King St W, Toronto, ON M5V 1A1, Canada",
      geometry: { location: { lat: () => 43.647, lng: () => -79.38 } },
      address_components: [
        { types: ["administrative_area_level_1"], short_name: "ON" },
        { types: ["postal_code"], long_name: "M5V 1A1" },
      ],
    });
    expect(start?.source).toBe("search");
    expect(start?.lat).toBe(43.647);
    expect(start?.provinceCode).toBe("ON");
    expect(start?.postalCode).toBe("M5V 1A1");
  });

  it("lets a typed address be committed when suggestions are unavailable", () => {
    expect(canCommitTypedStart("M5V 2T6", null)).toBe(true);
    expect(canCommitTypedStart("M5V 2T6", pinSelection(43.65, -79.38))).toBe(false);
    expect(canCommitTypedStart("x", null)).toBe(false);
  });

  it("uses the spec fallback copy for denied geolocation", () => {
    expect(GEOLOCATION_UNAVAILABLE_MESSAGE).toBe(
      "Location access isn't available. Search an address or choose a point on the map.",
    );
  });
});

describe("Phase 8.6 — external route URL matches itinerary order", () => {
  it("orders waypoints by sequence regardless of input order", () => {
    const url = buildExternalRouteUrl({ lat: 43.6, lng: -79.4 }, [
      { id: "b", seq: 2, lat: 43.62, lng: -79.42, name: "B", revisit: false, warn: false },
      { id: "a", seq: 1, lat: 43.61, lng: -79.41, name: "A", revisit: false, warn: false },
      { id: "c", seq: 3, lat: 43.63, lng: -79.43, name: "C", revisit: false, warn: false },
    ]);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("origin")).toBe("43.6,-79.4");
    expect(parsed.searchParams.get("destination")).toBe("43.63,-79.43"); // seq 3 last
    expect(parsed.searchParams.get("waypoints")).toBe("43.61,-79.41|43.62,-79.42"); // seq 1 → 2
  });
});

describe("Phase 8.6 — client-selected start bypasses server geocoding", () => {
  it("uses exact coordinates from a pin even when the text is un-geocodable", async () => {
    process.env.PLACES_PROVIDER = "mock";
    process.env.ROUTING_PROVIDER = "mock";
    const result = await runProspectSearch({
      provinceCode: "ON",
      startQuery: "Dropped pin (43.65000, -79.38000)", // mock geocoder cannot resolve this
      startCoords: { lat: 43.65, lng: -79.38 },
      startPlaceId: null,
      startLabel: "Dropped pin (43.65000, -79.38000)",
      dailyVisitTarget: 8,
      maxRadiusKm: 40,
      minFitScore: 3,
      alreadyVisitedRaw: "none",
      revisitsDueRaw: "none",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startPoint.lat).toBe(43.65);
      expect(result.startPoint.lng).toBe(-79.38);
      expect(result.result.entries.length).toBeGreaterThan(0);
    }
  });

  it("retains a Google Place ID through the pipeline", async () => {
    process.env.PLACES_PROVIDER = "mock";
    process.env.ROUTING_PROVIDER = "mock";
    const result = await runProspectSearch({
      provinceCode: "ON",
      startQuery: "128 Spadina Ave, Toronto",
      startCoords: { lat: 43.6461, lng: -79.3958 },
      startPlaceId: "ChIJtest123",
      startLabel: "128 Spadina Ave, Toronto, ON M5V 2K7",
      dailyVisitTarget: 5,
      maxRadiusKm: 40,
      minFitScore: 3,
      alreadyVisitedRaw: "none",
      revisitsDueRaw: "none",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startPoint.lat).toBeCloseTo(43.6461);
    }
  });
});
