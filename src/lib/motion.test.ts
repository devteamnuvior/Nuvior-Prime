import { afterEach, describe, expect, it, vi } from "vitest";
import { MOTION, easeOutCubic, prefersReducedMotion } from "./motion";

describe("motion tokens", () => {
  it("keeps the first-leg reveal in the 700–1000ms window", () => {
    expect(MOTION.routeRevealMs).toBeGreaterThanOrEqual(700);
    expect(MOTION.routeRevealMs).toBeLessThanOrEqual(1000);
  });

  it("eases out without overshoot", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(0.5)).toBeLessThan(1);
  });

  it("reads prefers-reduced-motion", () => {
    const matches = vi.fn(() => true);
    vi.stubGlobal("window", { matchMedia: () => ({ matches: matches() }) });
    expect(prefersReducedMotion()).toBe(true);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
