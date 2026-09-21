/**
 * Browser map configuration + experience-mode labelling.
 *
 * SECURITY: this module is imported by client components. It must only ever
 * read NEXT_PUBLIC_* variables. Server keys (GOOGLE_MAPS_SERVER_KEY,
 * GOOGLE_PLACES_API_KEY, GOOGLE_ROUTES_API_KEY, …) must never flow through here.
 *
 * Map renderer is independent of PLACES_PROVIDER / ROUTING_PROVIDER.
 * Priority: Google Live → Google Demo → CARTO/Leaflet fallback.
 */

export type MapRenderer = "google_live" | "google_demo" | "fallback";

export type BrowserMapsConfig = {
  /** Browser Maps JavaScript API key (live or demo). Empty in fallback. */
  apiKey: string;
  /** Cloud-styled Map ID; falls back to DEMO_MAP_ID (unstyled). */
  mapId: string;
  renderer: MapRenderer;
  /** True when a Google basemap should render (live or demo). */
  enabled: boolean;
};

const BROWSER_KEY_NAMES = [
  "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID",
] as const;

/**
 * Pure resolver — takes an env-shaped record and returns only browser-safe
 * config. Ignores anything that is not an allow-listed NEXT_PUBLIC_* name, so
 * a server key passed in by mistake can never reach the client bundle.
 *
 * Live key always wins over demo key. Leaflet is used only when neither is set.
 */
export function resolveBrowserMapsConfig(
  env: Record<string, string | undefined>,
): BrowserMapsConfig {
  const picked: Record<string, string> = {};
  for (const name of BROWSER_KEY_NAMES) {
    const v = env[name]?.trim();
    if (v) picked[name] = v;
  }
  const liveKey =
    picked.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? picked.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const demoKey = picked.NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY ?? "";
  const mapId = picked.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

  if (liveKey) {
    return { apiKey: liveKey, mapId, renderer: "google_live", enabled: true };
  }
  if (demoKey) {
    return { apiKey: demoKey, mapId, renderer: "google_demo", enabled: true };
  }
  return { apiKey: "", mapId, renderer: "fallback", enabled: false };
}

export function getBrowserMapsConfig(): BrowserMapsConfig {
  // NEXT_PUBLIC_* values are inlined at build time; reference them statically.
  return resolveBrowserMapsConfig({
    NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
  });
}

/* ------------------------------------------------------------------ */

export type ExperienceChip = {
  label: string;
  /** signal = development/demo, accent = live production data */
  tone: "signal" | "neutral" | "accent";
  detail: string;
};

export type ExperienceModeInfo = {
  mapRenderer: MapRenderer;
  chips: ExperienceChip[];
  /**
   * Hide chips only for a fully live session (live map + Google Places +
   * Google routing). Development always shows the renderer / routing chips.
   */
  showChips: boolean;
};

/**
 * What is this session actually running on? Map renderer is independent of
 * Places/Routes providers so a Google Demo basemap can sit on mock routing.
 */
export function resolveExperienceMode(input: {
  placesProvider: string;
  routingProvider: string;
  mapRenderer: MapRenderer;
}): ExperienceModeInfo {
  const places = input.placesProvider.toLowerCase();
  const routing = input.routingProvider.toLowerCase();
  const chips: ExperienceChip[] = [];

  if (input.mapRenderer === "google_live") {
    chips.push({
      label: "Google Live",
      tone: "accent",
      detail: "Production/staging Maps JavaScript API key",
    });
  } else if (input.mapRenderer === "google_demo") {
    chips.push({
      label: "Google Demo",
      tone: "signal",
      detail: "Maps Demo Key — local prototyping only, not production-ready",
    });
  } else {
    chips.push({
      label: "Fallback Map",
      tone: "signal",
      detail: "Leaflet/CARTO emergency fallback — no usable Google Maps key",
    });
  }

  if (routing === "mock") {
    chips.push({
      label: "Mock Routing",
      tone: "signal",
      detail: "Synthetic drive times — not the Google Routes API",
    });
  } else if (routing === "geodesic") {
    chips.push({
      label: "Geodesic estimates",
      tone: "neutral",
      detail: "Haversine distances — not verified drive times",
    });
  }

  const fullyLive =
    input.mapRenderer === "google_live" && places === "google" && routing === "google";

  return {
    mapRenderer: input.mapRenderer,
    chips,
    showChips: !fullyLive,
  };
}
