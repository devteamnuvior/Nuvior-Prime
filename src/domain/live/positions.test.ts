import { describe, expect, it } from "vitest";
import { boundingBox, countByStatus, deriveStatus, isRecent, nearestClinic, sortReps } from "./positions";

const now = Date.parse("2026-11-01T15:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("deriveStatus", () => {
  it("is offline without a fix or after three hours", () => {
    expect(deriveStatus(null, now)).toBe("offline");
    expect(deriveStatus({ recordedAt: ago(4 * 3_600_000), speedMps: 0, clinic: { id: "c" } }, now)).toBe("offline");
  });
  it("is at clinic whenever a clinic is resolved and the fix is fresh enough", () => {
    expect(deriveStatus({ recordedAt: ago(60_000), speedMps: 0, clinic: { id: "c" } }, now)).toBe("at_clinic");
    expect(deriveStatus({ recordedAt: ago(30 * 60_000), speedMps: null, clinic: { id: "c" } }, now)).toBe("at_clinic");
  });
  it("is travelling when moving recently, idle when still or stale", () => {
    expect(deriveStatus({ recordedAt: ago(5_000), speedMps: 12, clinic: null }, now)).toBe("travelling");
    expect(deriveStatus({ recordedAt: ago(5_000), speedMps: null, clinic: null }, now)).toBe("travelling");
    expect(deriveStatus({ recordedAt: ago(5_000), speedMps: 0.2, clinic: null }, now)).toBe("idle");
    expect(deriveStatus({ recordedAt: ago(20 * 60_000), speedMps: 12, clinic: null }, now)).toBe("idle");
  });
});

describe("nearestClinic", () => {
  const clinics = [
    { id: "a", lat: 43.6532, lng: -79.3832 },
    { id: "b", lat: 43.6540, lng: -79.3832 }, // ~90 m north of a
  ];
  it("returns the closest clinic within the radius", () => {
    expect(nearestClinic({ lat: 43.6538, lng: -79.3832 }, clinics)?.id).toBe("b");
  });
  it("returns null when nothing is close", () => {
    expect(nearestClinic({ lat: 43.7, lng: -79.3832 }, clinics)).toBeNull();
  });
});

describe("helpers", () => {
  it("flags recent fixes", () => {
    expect(isRecent(ago(5_000), now)).toBe(true);
    expect(isRecent(ago(60_000), now)).toBe(false);
  });
  it("builds a box that contains the radius", () => {
    const box = boundingBox({ lat: 51, lng: -114 }, 120);
    expect(box.maxLat - box.minLat).toBeGreaterThan(0.002);
    expect(box.maxLng - box.minLng).toBeGreaterThan(box.maxLat - box.minLat);
  });
  it("counts and sorts by status then name", () => {
    const rows = sortReps([
      { name: "Zed", status: "offline" as const },
      { name: "Amy", status: "travelling" as const },
      { name: "Bob", status: "at_clinic" as const },
      { name: "Al", status: "travelling" as const },
    ]);
    expect(rows.map((r) => r.name)).toEqual(["Bob", "Al", "Amy", "Zed"]);
    expect(countByStatus(rows)).toEqual({ at_clinic: 1, travelling: 2, idle: 0, offline: 1 });
  });
});
