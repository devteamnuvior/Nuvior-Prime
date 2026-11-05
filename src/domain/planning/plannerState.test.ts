import { describe, expect, it } from "vitest";
import {
  areaIsReady,
  buildBlockedReason,
  canBuildDay,
  collapsedPlanningCopy,
  collapsedRouteCopy,
  derivePhase,
  materialFingerprint,
  retainCommittedOnError,
  sessionMemoryIsPlanningState,
  type PlannerInputs,
} from "./plannerState";
import { pinSelection } from "@/lib/placeSelection";
import { DEFAULT_SEARCH_RADIUS_KM, areaLabel, defaultArea, effectiveRadiusKm, radiusKmForDrawnArea } from "./area";
import { opportunitySummary, candidateDots } from "./opportunity";
import type { VisitListEntry } from "@/domain/visitList";

const start = pinSelection(43.65, -79.38);
const base: PlannerInputs = {
  start,
  startText: "",
  textCommitted: false,
  provinceCode: "ON",
  provinceError: null,
  area: { kind: "none" },
  allowedProvinces: ["ON"],
};

describe("Phase 8.8 — planner state machine", () => {
  it("starts in no-start", () => {
    expect(
      derivePhase({ ...base, start: null }, {
        pending: false,
        hasCommittedRoute: false,
        editPlanOpen: false,
        manuallyAdjusted: false,
        committedFingerprint: null,
      }),
    ).toBe("no-start");
    expect(canBuildDay({ ...base, start: null })).toBe(false);
    expect(buildBlockedReason({ ...base, start: null })).toMatch(/starting point/i);
  });

  it("moves to choose-area after start", () => {
    expect(
      derivePhase(base, {
        pending: false,
        hasCommittedRoute: false,
        editPlanOpen: false,
        manuallyAdjusted: false,
        committedFingerprint: null,
      }),
    ).toBe("choose-area");
    expect(canBuildDay(base)).toBe(false);
    expect(buildBlockedReason(base)).toMatch(/today's area/i);
  });

  it("enables BUILD MY DAY with the default radius area", () => {
    const inputs = { ...base, area: defaultArea() };
    expect(areaIsReady(inputs.area)).toBe(true);
    expect(canBuildDay(inputs)).toBe(true);
    expect(buildBlockedReason(inputs)).toBeNull();
    expect(
      derivePhase(inputs, {
        pending: false,
        hasCommittedRoute: false,
        editPlanOpen: false,
        manuallyAdjusted: false,
        committedFingerprint: null,
      }),
    ).toBe("configure");
  });

  it("treats a valid drawn area as ready", () => {
    const square = [
      { lat: 43.64, lng: -79.40 },
      { lat: 43.64, lng: -79.36 },
      { lat: 43.67, lng: -79.36 },
      { lat: 43.67, lng: -79.40 },
    ];
    const inputs = { ...base, area: { kind: "drawn" as const, points: square } };
    expect(canBuildDay(inputs)).toBe(true);
  });

  it("rejects an invalid drawn area", () => {
    const inputs = {
      ...base,
      area: { kind: "drawn" as const, points: [{ lat: 43.65, lng: -79.38 }, { lat: 43.66, lng: -79.39 }] },
    };
    expect(canBuildDay(inputs)).toBe(false);
    expect(buildBlockedReason(inputs)).toMatch(/at least 3/i);
  });

  it("rejects a drawn area outside authorized territory", () => {
    const calgary = [
      { lat: 51.00, lng: -114.10 },
      { lat: 51.00, lng: -113.90 },
      { lat: 51.15, lng: -113.90 },
      { lat: 51.15, lng: -114.10 },
    ];
    const inputs = { ...base, area: { kind: "drawn" as const, points: calgary }, allowedProvinces: ["ON"] };
    expect(canBuildDay(inputs)).toBe(false);
    expect(buildBlockedReason(inputs)).toMatch(/outside your assigned territory/i);
  });

  it("shows building, then route-ready, then stale after a material change", () => {
    const inputs = { ...base, area: defaultArea() };
    expect(
      derivePhase(inputs, {
        pending: true,
        hasCommittedRoute: false,
        editPlanOpen: false,
        manuallyAdjusted: false,
        committedFingerprint: null,
      }),
    ).toBe("building");

    const fp = materialFingerprint(inputs);
    expect(
      derivePhase(inputs, {
        pending: false,
        hasCommittedRoute: true,
        editPlanOpen: false,
        manuallyAdjusted: false,
        committedFingerprint: fp,
      }),
    ).toBe("route-ready");

    expect(
      derivePhase(inputs, {
        pending: false,
        hasCommittedRoute: true,
        editPlanOpen: true,
        manuallyAdjusted: false,
        committedFingerprint: fp,
      }),
    ).toBe("edit-plan");

    const changed = { ...inputs, area: { kind: "radius" as const, km: 60 } };
    expect(
      derivePhase(changed, {
        pending: false,
        hasCommittedRoute: true,
        editPlanOpen: true,
        manuallyAdjusted: false,
        committedFingerprint: fp,
      }),
    ).toBe("stale");

    expect(
      derivePhase(inputs, {
        pending: false,
        hasCommittedRoute: true,
        editPlanOpen: false,
        manuallyAdjusted: true,
        committedFingerprint: fp,
      }),
    ).toBe("route-adjusted");
  });

  it("allows a committed address/postal start without coordinates (mock geocode path)", () => {
    const inputs: PlannerInputs = {
      ...base,
      start: null,
      startText: "M5V 2T6",
      textCommitted: true,
      area: defaultArea(),
    };
    expect(canBuildDay(inputs)).toBe(true);
    expect(
      derivePhase(inputs, {
        pending: false,
        hasCommittedRoute: false,
        editPlanOpen: false,
        manuallyAdjusted: false,
        committedFingerprint: null,
      }),
    ).toBe("configure");
  });

  it("blocks BUILD MY DAY when the start is outside authorized territory", () => {
    const inputs = {
      ...base,
      area: defaultArea(),
      provinceCode: null,
      provinceError: "That location is outside your assigned territory.",
    };
    expect(canBuildDay(inputs)).toBe(false);
    expect(buildBlockedReason(inputs)).toMatch(/outside/i);
  });

  it("marks the route stale when the search radius changes", () => {
    const inputs = { ...base, area: defaultArea() };
    const fp = materialFingerprint(inputs);
    const changed = { ...inputs, area: { kind: "radius" as const, km: 80 } };
    expect(materialFingerprint(changed)).not.toBe(fp);
    expect(
      derivePhase(changed, {
        pending: false,
        hasCommittedRoute: true,
        editPlanOpen: true,
        manuallyAdjusted: false,
        committedFingerprint: fp,
      }),
    ).toBe("stale");
  });

  it("does not treat brief/drawer UI as a material planning change", () => {
    const inputs = { ...base, area: defaultArea() };
    expect(materialFingerprint(inputs)).toBe(materialFingerprint({ ...inputs }));
    expect(sessionMemoryIsPlanningState(["start", "area", "briefId"])).toBe(
      true,
    );
  });
});

describe("Today's area — search radius, no drive-time preset", () => {
  it("defaults to a radius around the start and submits it as maxRadiusKm", () => {
    expect(defaultArea()).toEqual({ kind: "radius", km: DEFAULT_SEARCH_RADIUS_KM });
    expect(effectiveRadiusKm(defaultArea(), null)).toBe(DEFAULT_SEARCH_RADIUS_KM);
    expect(effectiveRadiusKm({ kind: "radius", km: 25 }, null)).toBe(25);
    expect(effectiveRadiusKm({ kind: "none" }, null)).toBe(DEFAULT_SEARCH_RADIUS_KM);
    expect(areaLabel(defaultArea())).toBe(`Within ${DEFAULT_SEARCH_RADIUS_KM} km of your start`);
  });

  it("covers a drawn outline with a radius that reaches its farthest vertex", () => {
    const origin = { lat: 43.65, lng: -79.38 };
    const far = [{ lat: 43.65, lng: -79.38 }, { lat: 43.9, lng: -79.38 }, { lat: 43.9, lng: -79.0 }];
    const km = radiusKmForDrawnArea(origin, far);
    expect(km).toBeGreaterThan(30);
    expect(effectiveRadiusKm({ kind: "drawn", points: far }, origin)).toBe(km);
    expect(radiusKmForDrawnArea(origin, [])).toBe(DEFAULT_SEARCH_RADIUS_KM);
  });
});

describe("Phase 8.8 — opportunity + candidate layer", () => {
  const entry = (id: string, revisit = false): VisitListEntry =>
    ({
      accountId: id,
      businessName: id,
      isRevisit: revisit,
    }) as VisitListEntry;

  it("summarizes qualified pool without a blocking extra step", () => {
    const s = opportunitySummary([entry("a", true), entry("b"), entry("c"), entry("d")]);
    expect(s.qualified).toBe(4);
    expect(s.revisitsDue).toBe(1);
  });

  it("never plots routed stops as candidates and only uses the qualified pool (no DNC)", () => {
    const dots = candidateDots(
      [entry("keep"), entry("routed")],
      {
        keep: { lat: 43.65, lng: -79.38 },
        routed: { lat: 43.66, lng: -79.39 },
        dnc: { lat: 43.7, lng: -79.4 }, // present in coords but not in qualified pool
      },
      new Set(["routed"]),
    );
    expect(dots.map((d) => d.id)).toEqual(["keep"]);
    expect(dots.find((d) => d.id === "dnc")).toBeUndefined();
    expect(dots.find((d) => d.id === "routed")).toBeUndefined();
  });

  it("distinguishes candidate dots from numbered route stops", () => {
    const dots = candidateDots([entry("keep")], { keep: { lat: 43.65, lng: -79.38 } }, new Set());
    expect(dots[0]).not.toHaveProperty("seq");
    expect(dots[0]!.id).toBe("keep");
  });
});

describe("Phase 8.8 — rebuild + mobile copy", () => {
  it("keeps the prior route when rebuild fails", () => {
    const prior = { id: "route-1" };
    expect(retainCommittedOnError(prior, { status: "error", message: "timeout" })).toEqual(prior);
    expect(retainCommittedOnError(prior, { status: "idle" })).toEqual(prior);
    expect(retainCommittedOnError(prior, { status: "success", data: { id: "route-2" } })).toEqual({ id: "route-2" });
    expect(retainCommittedOnError(null, { status: "error", message: "fail" })).toBeNull();
  });

  it("collapsed planning sheet shows start and area, not a giant form", () => {
    const empty = collapsedPlanningCopy({ hasStart: false, startLabel: "", area: { kind: "none" } });
    expect(empty.title).toMatch(/starting point/i);
    expect(empty.subtitle).toMatch(/today's area/i);

    const ready = collapsedPlanningCopy({
      hasStart: true,
      startLabel: "King & Spadina",
      area: defaultArea(),
    });
    expect(ready.title).toBe("King & Spadina");
    expect(ready.subtitle).toBe(`Within ${DEFAULT_SEARCH_RADIUS_KM} km of your start`);
  });

  it("collapsed route sheet shows next stop, not planning controls", () => {
    const copy = collapsedRouteCopy({
      seq: 1,
      name: "Clinic One",
      arrivalClock: "9:12 AM",
      adjusted: false,
    });
    expect(copy.kicker).toBe("Next");
    expect(copy.title).toMatch(/Clinic One/);
    expect(copy.subtitle).toBe("9:12 AM");
  });
});
