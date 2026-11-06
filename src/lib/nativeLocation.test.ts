import { describe, expect, it } from "vitest";
import { fixFromNativeLocation, isNativeApp } from "./nativeLocation";

const base = {
  latitude: 43.65,
  longitude: -79.38,
  accuracy: 8,
  altitude: null,
  altitudeAccuracy: null,
  simulated: false,
  bearing: 90,
  speed: 4.2,
  time: 1_700_000_000_000,
};

describe("fixFromNativeLocation", () => {
  it("maps the plugin's location to the /api/positions shape", () => {
    expect(fixFromNativeLocation(base)).toEqual({
      lat: 43.65,
      lng: -79.38,
      accuracyM: 8,
      headingDeg: 90,
      speedMps: 4.2,
      recordedAt: 1_700_000_000_000,
    });
  });

  it("drops iOS's -1 'unknown' heading and speed", () => {
    const fix = fixFromNativeLocation({ ...base, bearing: -1, speed: -1 });
    expect(fix.headingDeg).toBeNull();
    expect(fix.speedMps).toBeNull();
  });

  it("falls back to now when the fix has no timestamp", () => {
    expect(fixFromNativeLocation({ ...base, time: null }, 123).recordedAt).toBe(123);
  });
});

describe("isNativeApp", () => {
  it("is false outside the Capacitor shell", () => {
    expect(isNativeApp()).toBe(false);
  });
});
