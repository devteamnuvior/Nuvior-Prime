import { describe, expect, it } from "vitest";
import {
  parseWorkingArea,
  pointInWorkingArea,
  serializeWorkingArea,
  validateDrawnArea,
} from "./workingArea";
import { runProspectSearch } from "@/lib/prospecting";

const square = [
  { lat: 43.6, lng: -79.5 },
  { lat: 43.6, lng: -79.3 },
  { lat: 43.8, lng: -79.3 },
  { lat: 43.8, lng: -79.5 },
];

describe("Phase 8.6 — working area parsing", () => {
  it("returns null for empty input", () => {
    expect(parseWorkingArea(null)).toBeNull();
    expect(parseWorkingArea("")).toBeNull();
    expect(parseWorkingArea("[]")).toBeNull();
  });

  it("throws for invalid JSON", () => {
    expect(() => parseWorkingArea("not json")).toThrow(/valid JSON/);
  });

  it("throws for fewer than 3 points", () => {
    expect(() => parseWorkingArea(JSON.stringify(square.slice(0, 2)))).toThrow(/at least 3/);
  });

  it("throws for invalid coordinates", () => {
    expect(() =>
      parseWorkingArea(JSON.stringify([...square.slice(0, 2), { lat: 999, lng: 0 }])),
    ).toThrow(/invalid coordinate/);
    expect(() =>
      parseWorkingArea(JSON.stringify([...square.slice(0, 2), { lat: "x", lng: 0 }])),
    ).toThrow(/invalid coordinate/);
  });

  it("round-trips serialize → parse", () => {
    const parsed = parseWorkingArea(serializeWorkingArea(square));
    expect(parsed).toHaveLength(4);
    expect(parsed![0]!.lat).toBeCloseTo(43.6, 6);
    expect(parsed![2]!.lng).toBeCloseTo(-79.3, 6);
  });
});

describe("Phase 8.6 — point in working area", () => {
  it("detects inside and outside for a square", () => {
    expect(pointInWorkingArea({ lat: 43.7, lng: -79.4 }, square)).toBe(true);
    expect(pointInWorkingArea({ lat: 43.9, lng: -79.4 }, square)).toBe(false);
    expect(pointInWorkingArea({ lat: 43.7, lng: -79.6 }, square)).toBe(false);
  });

  it("handles a concave polygon", () => {
    // U-shape: notch cut from the top
    const uShape = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 10, lng: 10 },
      { lat: 10, lng: 7 },
      { lat: 3, lng: 7 },
      { lat: 3, lng: 3 },
      { lat: 10, lng: 3 },
      { lat: 10, lng: 0 },
    ];
    expect(pointInWorkingArea({ lat: 1, lng: 5 }, uShape)).toBe(true); // in the base
    expect(pointInWorkingArea({ lat: 8, lng: 5 }, uShape)).toBe(false); // in the notch
    expect(pointInWorkingArea({ lat: 8, lng: 1 }, uShape)).toBe(true); // in the left arm
  });
});

describe("Phase 8.8 — drawn area validation", () => {
  it("rejects fewer than 3 points", () => {
    expect(validateDrawnArea([{ lat: 43, lng: -79 }, { lat: 43.1, lng: -79 }]).ok).toBe(false);
  });

  it("rejects a self-intersecting bowtie", () => {
    const bowtie = [
      { lat: 43.6, lng: -79.5 },
      { lat: 43.8, lng: -79.3 },
      { lat: 43.6, lng: -79.3 },
      { lat: 43.8, lng: -79.5 },
    ];
    const v = validateDrawnArea(bowtie);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.message).toMatch(/crosses itself/i);
  });

  it("rejects a tiny accidental polygon", () => {
    const speck = [
      { lat: 43.65, lng: -79.38 },
      { lat: 43.6501, lng: -79.38 },
      { lat: 43.65, lng: -79.3801 },
    ];
    const v = validateDrawnArea(speck);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.message).toMatch(/too small/i);
  });

  it("accepts a city-scale square", () => {
    expect(
      validateDrawnArea([
        { lat: 43.6, lng: -79.5 },
        { lat: 43.6, lng: -79.3 },
        { lat: 43.8, lng: -79.3 },
        { lat: 43.8, lng: -79.5 },
      ]).ok,
    ).toBe(true);
  });
});

describe("Phase 8.6 — polygon area", () => {
  it("approximates a known square near Toronto", async () => {
    const { polygonAreaKm2 } = await import("./workingArea");
    // 0.1° × 0.1° at ~43.7°N: ~11.12 km tall × ~8.04 km wide ≈ 89 km²
    const areaKm2 = polygonAreaKm2([
      { lat: 43.65, lng: -79.45 },
      { lat: 43.65, lng: -79.35 },
      { lat: 43.75, lng: -79.35 },
      { lat: 43.75, lng: -79.45 },
    ]);
    expect(areaKm2).toBeGreaterThan(80);
    expect(areaKm2).toBeLessThan(100);
  });

  it("returns 0 for fewer than 3 points", async () => {
    const { polygonAreaKm2 } = await import("./workingArea");
    expect(polygonAreaKm2([{ lat: 43, lng: -79 }])).toBe(0);
  });
});

describe("Phase 8.6 — working area as discovery constraint", () => {
  it("excludes candidates outside the drawn area", async () => {
    process.env.PLACES_PROVIDER = "mock";
    process.env.ROUTING_PROVIDER = "mock";

    // Tiny area far from all Toronto mock clinics — everything excluded
    const remote = [
      { lat: 44.5, lng: -80.5 },
      { lat: 44.5, lng: -80.4 },
      { lat: 44.6, lng: -80.4 },
    ];
    const result = await runProspectSearch({
      provinceCode: "ON",
      startQuery: "M5V 2T6",
      dailyVisitTarget: 10,
      maxRadiusKm: 40,
      minFitScore: 1,
      alreadyVisitedRaw: "none",
      revisitsDueRaw: "none",
      workingArea: remote,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workingAreaApplied).not.toBeNull();
      expect(result.workingAreaApplied!.excludedOutsideArea).toBeGreaterThan(0);
      expect(result.result.entries).toHaveLength(0);
    }
  });

  it("keeps candidates when the area covers the territory", async () => {
    process.env.PLACES_PROVIDER = "mock";
    process.env.ROUTING_PROVIDER = "mock";

    const wide = [
      { lat: 43.0, lng: -80.0 },
      { lat: 43.0, lng: -78.8 },
      { lat: 44.2, lng: -78.8 },
      { lat: 44.2, lng: -80.0 },
    ];
    const result = await runProspectSearch({
      provinceCode: "ON",
      startQuery: "M5V 2T6",
      dailyVisitTarget: 10,
      maxRadiusKm: 40,
      minFitScore: 3,
      alreadyVisitedRaw: "none",
      revisitsDueRaw: "none",
      workingArea: wide,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.workingAreaApplied!.excludedOutsideArea).toBe(0);
      expect(result.result.entries.length).toBeGreaterThan(0);
    }
  });
});
