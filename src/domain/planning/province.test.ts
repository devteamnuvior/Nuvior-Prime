import { describe, expect, it } from "vitest";
import {
  OUTSIDE_TERRITORY_MESSAGE,
  drawnAreaInTerritory,
  inferProvinceFromCoords,
  inferProvinceFromPostal,
  resolvePlanningProvince,
} from "./province";

describe("Phase 8.8 — province inference", () => {
  it("maps Canadian FSA letters", () => {
    expect(inferProvinceFromPostal("M5V 2T6")).toBe("ON");
    expect(inferProvinceFromPostal("T2P 1J9")).toBe("AB");
    expect(inferProvinceFromPostal("V6B 1A1")).toBe("BC");
    expect(inferProvinceFromPostal("H2X 1Y4")).toBe("QC");
    expect(inferProvinceFromPostal(null)).toBeNull();
  });

  it("places downtown Toronto in ON", () => {
    expect(inferProvinceFromCoords({ lat: 43.65, lng: -79.38 })).toContain("ON");
  });

  it("prefers place components, then postal, then coords", () => {
    const r = resolvePlanningProvince({
      placeProvince: "ON",
      postalCode: "T2P 1J9",
      coords: { lat: 51.04, lng: -114.07 },
      allowedProvinces: ["ON", "AB"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.provinceCode).toBe("ON");
      expect(r.source).toBe("place");
    }
  });

  it("uses postal when place province is missing", () => {
    const r = resolvePlanningProvince({
      placeProvince: null,
      postalCode: "T2P 1J9",
      coords: null,
      allowedProvinces: ["AB"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.source).toBe("postal");
  });

  it("rejects a start outside the assigned territory and does not switch", () => {
    const r = resolvePlanningProvince({
      placeProvince: "AB",
      postalCode: "T2P 1J9",
      coords: { lat: 51.04, lng: -114.07 },
      allowedProvinces: ["ON"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("outside-territory");
      expect(r.inferred).toBe("AB");
    }
    expect(OUTSIDE_TERRITORY_MESSAGE).toMatch(/outside your assigned territory/i);
  });

  it("falls back to a sole authorized province when location is unresolved", () => {
    const r = resolvePlanningProvince({
      placeProvince: null,
      postalCode: null,
      coords: null,
      allowedProvinces: ["ON"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.provinceCode).toBe("ON");
      expect(r.source).toBe("single-territory");
    }
  });

  it("stays unresolved when several provinces are allowed and location is unknown", () => {
    const r = resolvePlanningProvince({
      placeProvince: null,
      postalCode: null,
      coords: null,
      allowedProvinces: ["ON", "AB"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unresolved");
  });

  it("rejects a drawn area whose vertices sit in an unauthorized province", () => {
    const calgary = [
      { lat: 51.04, lng: -114.08 },
      { lat: 51.05, lng: -114.06 },
      { lat: 51.06, lng: -114.09 },
    ];
    const r = drawnAreaInTerritory(calgary, ["ON"]);
    expect(r.ok).toBe(false);
    const toronto = [
      { lat: 43.64, lng: -79.4 },
      { lat: 43.64, lng: -79.36 },
      { lat: 43.67, lng: -79.36 },
    ];
    expect(drawnAreaInTerritory(toronto, ["ON"]).ok).toBe(true);
  });
});
