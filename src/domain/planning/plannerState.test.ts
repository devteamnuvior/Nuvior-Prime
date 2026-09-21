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
import { travelReachLabel, travelReachRadiusKm, effectiveDriveMinutes } from "./travelReach";
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
  dayStart: "09:00",
  dayEnd: "17:00",
  target: 20,
  minFit: 3,
  radiusOverride: null,
  driveOverride: null,
  alreadyVisited: "none",
  revisitsDue: "none",
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

  it("enables BUILD MY DAY once travel reach is selected", () => {
    const inputs = { ...base, area: { kind: "travel-reach" as const, minutes: 45 as const } };
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
    const inputs = { ...base, area: { kind: "travel-reach" as const, minutes: 45 as const } };
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

    const changed = { ...inputs, target: 12 };
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
      area: { kind: "travel-reach", minutes: 45 },
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
      area: { kind: "travel-reach" as const, minutes: 30 as const },
      provinceCode: null,
      provinceError: "That location is outside your assigned territory.",
    };
    expect(canBuildDay(inputs)).toBe(false);
    expect(buildBlockedReason(inputs)).toMatch(/outside/i);
  });

  it("marks the route stale when advanced radius override changes", () => {
    const inputs = { ...base, area: { kind: "travel-reach" as const, minutes: 45 as const } };
    const fp = materialFingerprint(inputs);
    const changed = { ...inputs, radiusOverride: 80 };
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
    const inputs = { ...base, area: { kind: "travel-reach" as const, minutes: 45 as const } };
    expect(materialFingerprint(inputs)).toBe(materialFingerprint({ ...inputs }));
    expect(sessionMemoryIsPlanningState(["start", "area", "dayStart", "dayEnd", "target", "minFit", "briefId"])).toBe(
      true,
    );
  });
});

describe("Phase 8.8 — travel reach", () => {
  it("is a real drive-time constraint, not an isochrone polygon", () => {
    expect(travelReachLabel(45)).toBe("Travel reach: 45 min");
    expect(travelReachRadiusKm(45)).toBe(55);
    expect(effectiveDriveMinutes({ kind: "travel-reach", minutes: 45 }, null)).toBe(45);
    expect(effectiveDriveMinutes({ kind: "drawn", points: [] }, null)).toBeNull();
    expect(effectiveDriveMinutes({ kind: "travel-reach", minutes: 30 }, 60)).toBe(60);
  });
});

describe("Phase 8.8 — opportunity + candidate layer", () => {
  const entry = (id: string, fit: number, revisit = false): VisitListEntry =>
    ({
      accountId: id,
      businessName: id,
      fitScore: fit,
      isRevisit: revisit,
    }) as VisitListEntry;

  it("summarizes qualified pool without a blocking extra step", () => {
    const s = opportunitySummary([
      entry("a", 5, true),
      entry("b", 5),
      entry("c", 4),
      entry("d", 3),
    ]);
    expect(s.qualified).toBe(4);
    expect(s.byFit[5]).toBe(2);
    expect(s.byFit[4]).toBe(1);
    expect(s.revisitsDue).toBe(1);
  });

  it("never plots routed stops as candidates and only uses the qualified pool (no DNC)", () => {
    const dots = candidateDots(
      [entry("keep", 4), entry("routed", 5)],
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
    const dots = candidateDots([entry("keep", 4)], { keep: { lat: 43.65, lng: -79.38 } }, new Set());
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
      area: { kind: "travel-reach", minutes: 45 },
    });
    expect(ready.title).toBe("King & Spadina");
    expect(ready.subtitle).toBe("Travel reach: 45 min");
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
