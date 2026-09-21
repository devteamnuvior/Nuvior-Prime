import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GEOLOCATION_DENIED_MESSAGE,
  GEOLOCATION_IFRAME_BLOCKED_MESSAGE,
  GEOLOCATION_POLICY_BLOCKED_MESSAGE,
  GEOLOCATION_TIMEOUT_MESSAGE,
  GEOLOCATION_UNAVAILABLE_MESSAGE,
  classifyPositionError,
  geolocationAllowedByDocumentPolicy,
  isEmbeddedDocument,
  requestBrowserLocation,
  type GeolocationLike,
} from "./browserGeolocation";

function mockGeo(impl: GeolocationLike["getCurrentPosition"]): GeolocationLike & { calls: number } {
  const api = {
    calls: 0,
    getCurrentPosition: ((success, error, options) => {
      api.calls += 1;
      impl(success, error, options);
    }) as GeolocationLike["getCurrentPosition"],
  };
  return api;
}

describe("browser geolocation — opt-in only", () => {
  it("does not request location until requestBrowserLocation is called", () => {
    const geo = mockGeo((success) => success({ coords: { latitude: 43.65, longitude: -79.38 } }));
    expect(geo.calls).toBe(0);
  });

  it("requests location only after an explicit call", async () => {
    const geo = mockGeo((success) => success({ coords: { latitude: 43.65, longitude: -79.38 } }));
    const result = await requestBrowserLocation(geo, {
      document: { permissionsPolicy: { allowsFeature: () => true } },
      window: { self: 1, top: 1 },
    });
    expect(geo.calls).toBe(1);
    expect(result).toEqual({ ok: true, lat: 43.65, lng: -79.38 });
  });

  it("never uses watchPosition — helper only exposes getCurrentPosition", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/browserGeolocation.ts"), "utf8");
    expect(src).not.toContain("watchPosition");
  });
});

describe("browser geolocation — failures keep Search / Drop pin usable", () => {
  it("maps user denial", async () => {
    const geo = mockGeo((_s, error) => error?.({ code: 1 }));
    const result = await requestBrowserLocation(geo, {
      document: { permissionsPolicy: { allowsFeature: () => true } },
      window: { self: 1, top: 1 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("denied");
      expect(result.message).toBe(GEOLOCATION_DENIED_MESSAGE);
    }
  });

  it("maps a document Permissions-Policy block without calling the API when possible", async () => {
    const geo = mockGeo((success) => success({ coords: { latitude: 0, longitude: 0 } }));
    const result = await requestBrowserLocation(geo, {
      document: { permissionsPolicy: { allowsFeature: () => false } },
      window: { self: 1, top: 1 },
    });
    expect(geo.calls).toBe(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("policy-blocked");
      expect(result.message).toBe(GEOLOCATION_POLICY_BLOCKED_MESSAGE);
    }
  });

  it("maps an iframe + policy block to iframe-specific copy", async () => {
    const geo = mockGeo((success) => success({ coords: { latitude: 0, longitude: 0 } }));
    const result = await requestBrowserLocation(geo, {
      document: { permissionsPolicy: { allowsFeature: () => false } },
      window: { self: 1, top: 2 },
    });
    expect(geo.calls).toBe(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("iframe-blocked");
      expect(result.message).toBe(GEOLOCATION_IFRAME_BLOCKED_MESSAGE);
    }
  });

  it("maps timeout and unavailable", async () => {
    const timeout = await requestBrowserLocation(mockGeo((_s, error) => error?.({ code: 3 })), {
      window: { self: 1, top: 1 },
    });
    expect(timeout.ok).toBe(false);
    if (!timeout.ok) {
      expect(timeout.reason).toBe("timeout");
      expect(timeout.message).toBe(GEOLOCATION_TIMEOUT_MESSAGE);
    }

    const missing = await requestBrowserLocation(null);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.reason).toBe("unavailable");
      expect(missing.message).toBe(GEOLOCATION_UNAVAILABLE_MESSAGE);
    }
  });

  it("classifies PositionError codes", () => {
    expect(classifyPositionError(1, { policyAllowed: true, embedded: false })).toBe("denied");
    expect(classifyPositionError(1, { policyAllowed: false, embedded: false })).toBe("policy-blocked");
    expect(classifyPositionError(1, { policyAllowed: false, embedded: true })).toBe("iframe-blocked");
    expect(classifyPositionError(2, { policyAllowed: true, embedded: false })).toBe("unavailable");
    expect(classifyPositionError(3, { policyAllowed: true, embedded: false })).toBe("timeout");
  });
});

describe("iframe / policy detection", () => {
  it("detects a framed document", () => {
    expect(isEmbeddedDocument({ self: 1, top: 1 })).toBe(false);
    expect(isEmbeddedDocument({ self: 1, top: 2 })).toBe(true);
    expect(
      isEmbeddedDocument(
        new Proxy({ self: 1, top: 1 }, {
          get(target, prop) {
            if (prop === "top") throw new Error("cross-origin");
            return target[prop as keyof typeof target];
          },
        }),
      ),
    ).toBe(true);
  });

  it("reads Permissions-Policy via permissionsPolicy or featurePolicy", () => {
    expect(
      geolocationAllowedByDocumentPolicy({ permissionsPolicy: { allowsFeature: (f) => f === "geolocation" } }),
    ).toBe(true);
    expect(geolocationAllowedByDocumentPolicy({ featurePolicy: { allowsFeature: () => false } })).toBe(false);
    expect(geolocationAllowedByDocumentPolicy({})).toBeNull();
  });
});

describe("search / autocomplete never requests geolocation", () => {
  it("StartLocationField does not call the Geolocation API", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/today/StartLocationField.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/getCurrentPosition|watchPosition|navigator\.geolocation|requestBrowserLocation/);
    expect(src).toContain("fetchGeocoderSuggestions");
  });

  it("PlanningWorkspace only requests location from the Use my location handler", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/today/PlanningWorkspace.tsx"),
      "utf8",
    );
    expect(src).toContain("const useMyLocation = async");
    expect(src).toMatch(/onClick=\{useMyLocation\}/);
    expect(src).not.toContain("watchPosition");
    expect(src).not.toMatch(/useEffect\([\s\S]{0,400}requestBrowserLocation/);
    expect(src).toMatch(/const useMyLocation = async[\s\S]+requestBrowserLocation/);
  });
});
