import { describe, expect, it } from "vitest";
import { resolveBrowserMapsConfig, resolveExperienceMode } from "./mapsConfig";

describe("browser maps config — renderer priority", () => {
  it("exposes only allow-listed NEXT_PUBLIC values", () => {
    const cfg = resolveBrowserMapsConfig({
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "browser-key",
      NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: "map-id-1",
      GOOGLE_PLACES_API_KEY: "SERVER-SECRET-PLACES",
      GOOGLE_ROUTES_API_KEY: "SERVER-SECRET-ROUTES",
      CRM_API_TOKEN: "SERVER-SECRET-CRM",
      AUTH_SECRET: "SERVER-SECRET-AUTH",
    });
    expect(cfg.apiKey).toBe("browser-key");
    expect(cfg.mapId).toBe("map-id-1");
    expect(cfg.enabled).toBe(true);
    expect(cfg.renderer).toBe("google_live");
    const serialized = JSON.stringify(cfg);
    expect(serialized).not.toContain("SERVER-SECRET");
  });

  it("never falls back to a server key when browser keys are missing", () => {
    const cfg = resolveBrowserMapsConfig({
      GOOGLE_PLACES_API_KEY: "SERVER-SECRET-PLACES",
      GOOGLE_ROUTES_API_KEY: "SERVER-SECRET-ROUTES",
    });
    expect(cfg.apiKey).toBe("");
    expect(cfg.enabled).toBe(false);
    expect(cfg.renderer).toBe("fallback");
  });

  it("prefers NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY over the legacy live key", () => {
    const cfg = resolveBrowserMapsConfig({
      NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: "browser-preferred",
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "legacy-live",
      NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY: "demo-key",
    });
    expect(cfg.apiKey).toBe("browser-preferred");
    expect(cfg.renderer).toBe("google_live");
  });

  it("uses the demo key when no live key is set", () => {
    const cfg = resolveBrowserMapsConfig({
      NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY: "demo-key",
    });
    expect(cfg.apiKey).toBe("demo-key");
    expect(cfg.enabled).toBe(true);
    expect(cfg.renderer).toBe("google_demo");
    expect(cfg.mapId).toBe("DEMO_MAP_ID");
  });

  it("prefers the live key over the demo key", () => {
    const cfg = resolveBrowserMapsConfig({
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "live-key",
      NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY: "demo-key",
    });
    expect(cfg.apiKey).toBe("live-key");
    expect(cfg.renderer).toBe("google_live");
  });

  it("treats blank live key as absent so demo can win", () => {
    const cfg = resolveBrowserMapsConfig({
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "   ",
      NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY: "demo-key",
    });
    expect(cfg.renderer).toBe("google_demo");
    expect(cfg.apiKey).toBe("demo-key");
  });

  it("falls back to Leaflet only when neither Google key exists", () => {
    const cfg = resolveBrowserMapsConfig({});
    expect(cfg.renderer).toBe("fallback");
    expect(cfg.enabled).toBe(false);
  });

  it("defaults the map id for development", () => {
    const cfg = resolveBrowserMapsConfig({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "k" });
    expect(cfg.mapId).toBe("DEMO_MAP_ID");
  });
});

describe("experience mode chips", () => {
  it("labels Google Demo + mock routing independently of Places", () => {
    const m = resolveExperienceMode({
      placesProvider: "mock",
      routingProvider: "mock",
      mapRenderer: "google_demo",
    });
    expect(m.chips.map((c) => c.label)).toEqual(["Google Demo", "Mock Routing"]);
    expect(m.showChips).toBe(true);
    expect(m.mapRenderer).toBe("google_demo");
  });

  it("labels Google Live and hides chips only when Places and Routes are also Google", () => {
    const live = resolveExperienceMode({
      placesProvider: "google",
      routingProvider: "google",
      mapRenderer: "google_live",
    });
    expect(live.chips.map((c) => c.label)).toEqual(["Google Live"]);
    expect(live.showChips).toBe(false);

    const liveMapMockRoutes = resolveExperienceMode({
      placesProvider: "mock",
      routingProvider: "mock",
      mapRenderer: "google_live",
    });
    expect(liveMapMockRoutes.chips.map((c) => c.label)).toEqual(["Google Live", "Mock Routing"]);
    expect(liveMapMockRoutes.showChips).toBe(true);
  });

  it("labels the CARTO fallback as Fallback Map, not as Google", () => {
    const m = resolveExperienceMode({
      placesProvider: "mock",
      routingProvider: "mock",
      mapRenderer: "fallback",
    });
    expect(m.chips.map((c) => c.label)).toEqual(["Fallback Map", "Mock Routing"]);
    expect(m.showChips).toBe(true);
  });

  it("keeps geodesic estimates honest on a Google Demo basemap", () => {
    const m = resolveExperienceMode({
      placesProvider: "mock",
      routingProvider: "geodesic",
      mapRenderer: "google_demo",
    });
    expect(m.chips.map((c) => c.label)).toEqual(["Google Demo", "Geodesic estimates"]);
  });
});
