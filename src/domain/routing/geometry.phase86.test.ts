import { describe, expect, it, afterEach, vi } from "vitest";
import { decodePolyline, segmentRouteRequests, MAX_INTERMEDIATES_PER_REQUEST } from "./polyline";
import { GoogleRoutingProvider } from "@/providers/routing/googleRoutingProvider";
import { runProspectSearch } from "@/lib/prospecting";

describe("Phase 8.6 — encoded polyline decoding", () => {
  it("decodes the canonical Google example", () => {
    // From Google's polyline algorithm documentation
    const points = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(points).toHaveLength(3);
    expect(points[0]!.lat).toBeCloseTo(38.5, 4);
    expect(points[0]!.lng).toBeCloseTo(-120.2, 4);
    expect(points[1]!.lat).toBeCloseTo(40.7, 4);
    expect(points[1]!.lng).toBeCloseTo(-120.95, 4);
    expect(points[2]!.lat).toBeCloseTo(43.252, 4);
    expect(points[2]!.lng).toBeCloseTo(-126.453, 4);
  });

  it("returns empty array for empty input", () => {
    expect(decodePolyline("")).toEqual([]);
  });
});

describe("Phase 8.6 — route request segmentation", () => {
  const pt = (i: number) => ({ lat: 43 + i * 0.01, lng: -79 - i * 0.01, i });

  it("uses a single request when within the waypoint limit", () => {
    const points = Array.from({ length: 20 }, (_, i) => pt(i));
    const segments = segmentRouteRequests(points);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.origin).toBe(points[0]);
    expect(segments[0]!.destination).toBe(points[19]);
    expect(segments[0]!.intermediates).toHaveLength(18);
  });

  it("splits long routes into chained segments preserving exact order", () => {
    const points = Array.from({ length: 60 }, (_, i) => pt(i));
    const segments = segmentRouteRequests(points);
    expect(segments.length).toBeGreaterThan(1);

    // Every segment respects the API limit
    for (const s of segments) {
      expect(s.intermediates.length).toBeLessThanOrEqual(MAX_INTERMEDIATES_PER_REQUEST);
    }
    // Segments chain: destination of one is origin of the next (continuous route)
    for (let k = 1; k < segments.length; k++) {
      expect(segments[k]!.origin).toBe(segments[k - 1]!.destination);
    }
    // Reassembling segments yields the original sequence — no stop dropped or reordered
    const reassembled = [
      segments[0]!.origin,
      ...segments.flatMap((s) => [...s.intermediates, s.destination]),
    ];
    expect(reassembled).toEqual(points);
  });

  it("returns no segments for fewer than 2 points", () => {
    expect(segmentRouteRequests([pt(0)])).toEqual([]);
    expect(segmentRouteRequests([])).toEqual([]);
  });
});

describe("Phase 8.6 — Google geometry failure fallback", () => {
  const provider = () =>
    new GoogleRoutingProvider({
      apiKey: "test-key-not-real",
      cacheTtlSeconds: 1,
      timeoutMs: 500,
      trafficAware: false,
    });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when the Routes API responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("denied", { status: 403 })),
    );
    const result = await provider().computeRouteGeometry(
      [
        { lat: 43.65, lng: -79.38 },
        { lat: 43.66, lng: -79.4 },
      ],
      { maxApiCalls: 5, trafficAware: false, timeoutMs: 500 },
    );
    expect(result).toBeNull();
  });

  it("returns null instead of partial geometry when a segment fails mid-route", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call += 1;
        if (call === 1) {
          return new Response(
            JSON.stringify({ routes: [{ polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC" } }] }),
            { status: 200 },
          );
        }
        return new Response("boom", { status: 500 });
      }),
    );
    // 60 points forces multiple segments
    const points = Array.from({ length: 60 }, (_, i) => ({
      lat: 43 + i * 0.001,
      lng: -79 - i * 0.001,
    }));
    const result = await provider().computeRouteGeometry(points, {
      maxApiCalls: 10,
      trafficAware: false,
      timeoutMs: 500,
    });
    expect(result).toBeNull();
  });

  it("refuses to exceed the API-call budget", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const points = Array.from({ length: 60 }, (_, i) => ({
      lat: 43 + i * 0.001,
      lng: -79 - i * 0.001,
    }));
    const result = await provider().computeRouteGeometry(points, {
      maxApiCalls: 1, // 60 points needs >1 segment
      trafficAware: false,
      timeoutMs: 500,
    });
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("parses a successful single-segment response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ routes: [{ polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC" } }] }),
            { status: 200 },
          ),
      ),
    );
    const result = await provider().computeRouteGeometry(
      [
        { lat: 43.65, lng: -79.38 },
        { lat: 43.66, lng: -79.4 },
      ],
      { maxApiCalls: 5, trafficAware: false, timeoutMs: 500 },
    );
    expect(result).not.toBeNull();
    expect(result!.encodedSegments).toHaveLength(1);
    expect(decodePolyline(result!.encodedSegments[0]!).length).toBeGreaterThanOrEqual(2);
  });
});

describe("Phase 8.6 — pipeline geometry fallback (mock provider)", () => {
  it("mock routing yields no road geometry and the run stays healthy", async () => {
    process.env.PLACES_PROVIDER = "mock";
    process.env.ROUTING_PROVIDER = "mock";
    const result = await runProspectSearch({
      provinceCode: "ON",
      startQuery: "M5V 2T6",
      dailyVisitTarget: 8,
      maxRadiusKm: 40,
      minFitScore: 3,
      alreadyVisitedRaw: "none",
      revisitsDueRaw: "none",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.routeGeometry).toBeNull();
      expect(result.result.entries.length).toBeGreaterThan(0);
    }
  });
});
