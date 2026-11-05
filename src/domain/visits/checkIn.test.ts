import { describe, expect, it } from "vitest";
import { CHECK_IN_RADIUS_M, distanceMeters, formatDistance, presenceFor, suggestedDurationMinutes } from "./checkIn";

const clinic = { lat: 43.6705, lng: -79.3933 };
const open = { id: "ci1", placeId: "p1", checkedInAt: "2026-11-05T14:00:00.000Z", checkedOutAt: null };

describe("check-in presence", () => {
  it("offers Check In within the radius and reports distance outside it", () => {
    const near = { lat: clinic.lat + 0.001, lng: clinic.lng }; // ~111 m north
    const far = { lat: clinic.lat + 0.02, lng: clinic.lng }; // ~2.2 km
    expect(distanceMeters(clinic, near)).toBeLessThan(CHECK_IN_RADIUS_M);
    expect(presenceFor({ placeId: "p1", openCheckIn: null, position: near, locationStatus: "watching", stop: clinic })).toMatchObject({ kind: "arrived" });
    expect(presenceFor({ placeId: "p1", openCheckIn: null, position: far, locationStatus: "watching", stop: clinic })).toMatchObject({ kind: "away" });
  });

  it("falls back to a manual check-in when there is no fix", () => {
    expect(presenceFor({ placeId: "p1", openCheckIn: null, position: null, locationStatus: "denied", stop: clinic })).toEqual({ kind: "no_location", status: "denied" });
  });

  it("shows Check Out only for the clinic the rep is checked in at", () => {
    const here = presenceFor({ placeId: "p1", openCheckIn: open, position: null, locationStatus: "idle", stop: clinic });
    const elsewhere = presenceFor({ placeId: "p2", openCheckIn: open, position: null, locationStatus: "idle", stop: clinic });
    expect(here.kind).toBe("checked_in");
    expect(elsewhere.kind).toBe("checked_in_elsewhere");
  });

  it("suggests a visit length in 45-minute slots from the stay", () => {
    const t0 = "2026-11-05T14:00:00.000Z";
    expect(suggestedDurationMinutes(t0, "2026-11-05T14:10:00.000Z")).toBe(45);
    expect(suggestedDurationMinutes(t0, "2026-11-05T15:10:00.000Z")).toBe(90);
    expect(suggestedDurationMinutes(t0, "2026-11-05T19:00:00.000Z")).toBe(180);
  });

  it("formats distances for people", () => {
    expect(formatDistance(80)).toBe("80 m");
    expect(formatDistance(1250)).toBe("1.3 km");
    expect(formatDistance(12_500)).toBe("13 km");
  });
});
