import { describe, expect, it } from "vitest";
import { ACTIVE_GRADIENT, ROUTE_LINE, activeBandColor, strokeForRole } from "./routeLineStyles";

describe("route line hierarchy", () => {
  it("keeps the active stroke stronger than future and completed", () => {
    expect(ROUTE_LINE.activeBase.weight).toBeGreaterThan(ROUTE_LINE.future.weight);
    expect(ROUTE_LINE.activeBase.opacity).toBeGreaterThan(ROUTE_LINE.future.opacity);
    expect(ROUTE_LINE.future.opacity).toBeGreaterThan(ROUTE_LINE.completed.opacity);
    expect(ROUTE_LINE.casing.weight).toBeGreaterThan(ROUTE_LINE.activeBase.weight);
    expect(ROUTE_LINE.casing.weight - ROUTE_LINE.activeBase.weight).toBeLessThanOrEqual(3);
  });

  it("uses a short restrained teal wash, not a high-contrast ramp", () => {
    expect(ACTIVE_GRADIENT.bands).toBeLessThanOrEqual(4);
    expect(activeBandColor(0).toLowerCase()).toBe(ACTIVE_GRADIENT.from.toLowerCase());
    expect(activeBandColor(1).toLowerCase()).toBe(ACTIVE_GRADIENT.to.toLowerCase());
    expect(strokeForRole("active").color).toBe(ROUTE_LINE.activeBase.color);
    expect(strokeForRole("future").opacity).toBeLessThan(0.35);
  });
});
