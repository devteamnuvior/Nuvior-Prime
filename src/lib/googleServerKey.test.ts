import { describe, expect, it } from "vitest";
import { googleServerKeyNames, resolveGoogleServerKey } from "./googleServerKey";
import { resolveBrowserMapsConfig } from "./mapsConfig";

describe("Google key separation", () => {
  it("prefers GOOGLE_MAPS_SERVER_KEY on the server", () => {
    expect(
      resolveGoogleServerKey({
        GOOGLE_MAPS_SERVER_KEY: "server-unified",
        GOOGLE_PLACES_API_KEY: "legacy-places",
      }),
    ).toBe("server-unified");
  });

  it("falls back to legacy Places then Routes keys", () => {
    expect(resolveGoogleServerKey({ GOOGLE_PLACES_API_KEY: "places" })).toBe("places");
    expect(resolveGoogleServerKey({ GOOGLE_ROUTES_API_KEY: "routes" })).toBe("routes");
    expect(resolveGoogleServerKey({})).toBe("");
  });

  it("never places a server key into browser map config", () => {
    const cfg = resolveBrowserMapsConfig({
      GOOGLE_MAPS_SERVER_KEY: "SERVER-SECRET-UNIFIED",
      GOOGLE_PLACES_API_KEY: "SERVER-SECRET-PLACES",
      GOOGLE_ROUTES_API_KEY: "SERVER-SECRET-ROUTES",
      NEXT_PUBLIC_GOOGLE_MAPS_DEMO_KEY: "demo-ok",
    });
    const serialized = JSON.stringify(cfg);
    expect(serialized).not.toContain("SERVER-SECRET");
    expect(cfg.apiKey).toBe("demo-ok");
    expect(cfg.renderer).toBe("google_demo");
    for (const name of googleServerKeyNames()) {
      expect(serialized).not.toContain(name);
    }
  });

  it("does not treat GOOGLE_MAPS_SERVER_KEY as a browser key even if someone prefixes it", () => {
    const cfg = resolveBrowserMapsConfig({
      GOOGLE_MAPS_SERVER_KEY: "must-not-leak",
    });
    expect(cfg.enabled).toBe(false);
    expect(cfg.renderer).toBe("fallback");
    expect(cfg.apiKey).toBe("");
  });
});
