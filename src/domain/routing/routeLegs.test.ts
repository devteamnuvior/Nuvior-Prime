import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activeLegIndex,
  buildRouteLegs,
  flattenRouteSegments,
  gradientBands,
  pathPrefix,
  pathSlice,
  roleForLeg,
  schematicStraight,
  splitPolylineAtWaypoints,
} from "./routeLegs";

const start = { lat: 43.65, lng: -79.38 };
const a = { lat: 43.66, lng: -79.37 };
const b = { lat: 43.67, lng: -79.36 };

describe("route legs — geometry is not invented", () => {
  it("flattens chained segments without duplicating the join vertex", () => {
    const flat = flattenRouteSegments([
      [start, a],
      [a, b],
    ]);
    expect(flat).toEqual([start, a, b]);
  });

  it("splits a road polyline at nearest vertices and keeps those vertices exact", () => {
    const mid = { lat: 43.655, lng: -79.375 };
    const path = [start, mid, a, { lat: 43.665, lng: -79.365 }, b];
    const legs = splitPolylineAtWaypoints(path, [start, a, b]);
    expect(legs).toHaveLength(2);
    expect(legs[0]![0]).toEqual(start);
    expect(legs[0]![legs[0]!.length - 1]).toEqual(a);
    expect(legs[1]![0]).toEqual(a);
    for (const p of legs[0]!) {
      expect(path).toContainEqual(p);
    }
  });

  it("renders mock legs as a direct two-point segment", () => {
    const far = { lat: 43.72, lng: -79.3 };
    expect(schematicStraight(start, far)).toEqual([start, far]);
    const near = { lat: start.lat + 0.0004, lng: start.lng + 0.0004 };
    expect(schematicStraight(start, near)).toEqual([start, near]);
  });

  it("marks schematic legs when no road geometry exists", () => {
    const legs = buildRouteLegs(
      start,
      [
        { id: "1", seq: 1, lat: a.lat, lng: a.lng },
        { id: "2", seq: 2, lat: b.lat, lng: b.lng },
      ],
      null,
    );
    expect(legs).toHaveLength(2);
    expect(legs.every((l) => l.schematic)).toBe(true);
    expect(legs[0]!.path).toEqual([start, a]);
    expect(legs[1]!.path).toEqual([a, b]);
  });

  it("uses provider vertices when geometry exists", () => {
    const road = [start, { lat: 43.652, lng: -79.378 }, a, { lat: 43.664, lng: -79.366 }, b];
    const legs = buildRouteLegs(
      start,
      [
        { id: "1", seq: 1, lat: a.lat, lng: a.lng },
        { id: "2", seq: 2, lat: b.lat, lng: b.lng },
      ],
      [road],
    );
    expect(legs[0]!.schematic).toBe(false);
    expect(road).toEqual(expect.arrayContaining(legs[0]!.path));
  });
});

describe("path prefix and active leg", () => {
  it("returns the first point at t=0 and the full path at t=1", () => {
    const path = [start, a, b];
    expect(pathPrefix(path, 0)).toEqual([start]);
    expect(pathPrefix(path, 1)).toEqual(path);
  });

  it("slices a path into overlapping gradient bands that still span the line", () => {
    const path = [start, a, b];
    const bands = gradientBands(path, 3);
    expect(bands).toHaveLength(3);
    expect(bands[0]![0]).toEqual(start);
    expect(bands[bands.length - 1]![bands[bands.length - 1]!.length - 1]).toEqual(b);
    const mid = pathSlice(path, 0.25, 0.5);
    expect(mid.length).toBeGreaterThanOrEqual(2);
  });

  it("interpolates only along an existing segment", () => {
    const path = [start, a];
    const mid = pathPrefix(path, 0.5);
    expect(mid[0]).toEqual(start);
    const last = mid[mid.length - 1]!;
    expect(last.lat).toBeGreaterThan(start.lat);
    expect(last.lat).toBeLessThan(a.lat);
  });

  it("maps selected stop N to incoming leg N-1", () => {
    const stops = [
      { id: "s1", seq: 1 },
      { id: "s2", seq: 2 },
      { id: "s5", seq: 5 },
    ];
    expect(activeLegIndex(stops, "s1", null)).toBe(0);
    expect(activeLegIndex(stops, "s2", null)).toBe(1);
    expect(activeLegIndex(stops, "s5", null)).toBe(4);
    expect(activeLegIndex(stops, null, null)).toBe(0);
    expect(roleForLeg(0, 0)).toBe("active");
    expect(roleForLeg(1, 0)).toBe("future");
    expect(roleForLeg(0, 2)).toBe("completed");
  });
});

describe("route overlay has no traveling object", () => {
  it("Google layers do not create a moving circle or pulse icon", () => {
    const src = readFileSync(resolve(process.cwd(), "src/components/today/GoogleRouteLayers.tsx"), "utf8");
    expect(src).not.toMatch(/SymbolPath\.CIRCLE|pulseIcon|startPulse|icons:/);
    expect(src).not.toMatch(/applyGradientBands\(g, prefix/);
  });

  it("mock geometry has no bezier or bow interpolation", () => {
    const src = readFileSync(resolve(process.cwd(), "src/domain/routing/routeLegs.ts"), "utf8");
    expect(src).not.toMatch(/schematicCurve|ctrl\.lat|2 \* u \* t/);
    expect(src).toMatch(/schematicStraight/);
  });
});
