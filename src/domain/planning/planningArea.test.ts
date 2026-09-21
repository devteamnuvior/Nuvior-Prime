import { describe, expect, it } from "vitest";
import {
  REVISIT_OUTSIDE_DRAWN_AREA_POLICY,
  drawnArea,
  driveTimeArea,
  planningAreaKind,
  radiusArea,
} from "./planningArea";
import { canBuildDay, derivePhase, materialFingerprint, type PlannerInputs } from "./plannerState";
import { pinSelection } from "@/lib/placeSelection";
import { effectiveRadiusKm } from "./travelReach";
import { filterPoolByArea, clusterCandidateDots, candidateDots, opportunitySummary } from "./opportunity";
import { parseWorkingArea, pointInWorkingArea, serializeWorkingArea, validateDrawnArea } from "@/domain/geo/workingArea";
import type { VisitListEntry } from "@/domain/visitList";
import { parsePlannerSession, serializePlannerSession } from "./sessionMemory";

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

const square = [
  { lat: 43.64, lng: -79.4 },
  { lat: 43.64, lng: -79.36 },
  { lat: 43.67, lng: -79.36 },
  { lat: 43.67, lng: -79.4 },
];

describe("Today's Area model", () => {
  it("selects a drive-time area as a real constraint", () => {
    const area = driveTimeArea(45);
    expect(planningAreaKind(area)).toBe("drive-time");
    expect(canBuildDay({ ...base, area })).toBe(true);
    expect(
      derivePhase(
        { ...base, area },
        {
          pending: false,
          hasCommittedRoute: false,
          editPlanOpen: false,
          manuallyAdjusted: false,
          committedFingerprint: null,
        },
      ),
    ).toBe("configure");
  });

  it("treats advanced radius as a first-class area", () => {
    const area = radiusArea(25);
    expect(planningAreaKind(area)).toBe("radius");
    expect(canBuildDay({ ...base, area })).toBe(true);
    expect(effectiveRadiusKm(area, { lat: 43.65, lng: -79.38 }, null)).toBe(25);
  });

  it("round-trips drawn polygon data and rejects invalid polygons", () => {
    const area = drawnArea(square);
    expect(planningAreaKind(area)).toBe("drawn");
    expect(validateDrawnArea(square).ok).toBe(true);
    const parsed = parseWorkingArea(serializeWorkingArea(square));
    expect(parsed).toHaveLength(4);
    expect(canBuildDay({ ...base, area })).toBe(true);
    expect(canBuildDay({ ...base, area: drawnArea(square.slice(0, 2)) })).toBe(false);
  });

  it("documents that due revisits outside a drawn area are excluded", () => {
    expect(REVISIT_OUTSIDE_DRAWN_AREA_POLICY).toMatch(/no revisit exception/i);
  });
});

describe("point-in-polygon filtering + opportunity", () => {
  const entry = (id: string, fit: number, extra: Partial<VisitListEntry> = {}): VisitListEntry =>
    ({ accountId: id, businessName: id, fitScore: fit, isRevisit: false, ...extra }) as VisitListEntry;

  it("keeps only in-area candidates when the drawn area changes", () => {
    const pool = [entry("in", 5), entry("out", 4, { isRevisit: true })];
    const coords = {
      in: { lat: 43.65, lng: -79.38 },
      out: { lat: 44.5, lng: -80.5 },
    };
    expect(pointInWorkingArea(coords.in, square)).toBe(true);
    expect(pointInWorkingArea(coords.out, square)).toBe(false);
    const filtered = filterPoolByArea(pool, coords, drawnArea(square));
    expect(filtered.map((e) => e.accountId)).toEqual(["in"]);
    expect(opportunitySummary(filtered).revisitsDue).toBe(0);
  });

  it("never emits DNC ids — only the qualified pool is plotted", () => {
    const dots = candidateDots(
      [entry("keep", 4)],
      { keep: { lat: 43.65, lng: -79.38 }, dnc: { lat: 43.7, lng: -79.4 } },
      new Set(),
    );
    expect(dots.map((d) => d.id)).toEqual(["keep"]);
    expect(dots[0]!.kind).toBe("prospect");
  });

  it("classifies revisit / verify / nuvior markers", () => {
    const dots = candidateDots(
      [
        entry("r", 5, { isRevisit: true }),
        entry("v", 4, { needsManualVerification: true }),
        entry("n", 5),
      ],
      {
        r: { lat: 43.65, lng: -79.38 },
        v: { lat: 43.66, lng: -79.37 },
        n: { lat: 43.655, lng: -79.375 },
      },
      new Set(),
      { crmApplied: { n: { applied: true, crmExternalId: "CRM-1" } } },
    );
    expect(dots.find((d) => d.id === "r")?.kind).toBe("revisit");
    expect(dots.find((d) => d.id === "v")?.kind).toBe("verify");
    expect(dots.find((d) => d.id === "n")?.kind).toBe("nuvior");
  });

  it("clusters when candidate density is high", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      candidateDots(
        [entry(`a${i}`, 3)],
        { [`a${i}`]: { lat: 43.65 + i * 0.0001, lng: -79.38 } },
        new Set(),
      )[0]!,
    );
    const clustered = clusterCandidateDots(many, 0.05);
    expect(clustered.some((m) => m.type === "cluster")).toBe(true);
  });
});

describe("PLAN → ROUTE and Edit plan", () => {
  it("transitions configure → building → route-ready → edit-plan", () => {
    const inputs = { ...base, area: driveTimeArea(45) };
    expect(
      derivePhase(inputs, {
        pending: false,
        hasCommittedRoute: false,
        editPlanOpen: false,
        manuallyAdjusted: false,
        committedFingerprint: null,
      }),
    ).toBe("configure");
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
  });
});

describe("session memory", () => {
  it("round-trips planner inputs so a refresh can restore the plan", () => {
    const snap = {
      start,
      startText: start.label,
      textCommitted: true,
      area: driveTimeArea(45),
      dayStart: "09:00",
      dayEnd: "17:00",
      target: 12,
      minFit: 3,
      radiusOverride: null,
      driveOverride: null,
      alreadyVisited: "none",
      revisitsDue: "none",
      province: "ON",
    };
    const parsed = parsePlannerSession(serializePlannerSession(snap));
    expect(parsed?.area).toEqual(driveTimeArea(45));
    expect(parsed?.start?.source).toBe("map-pin");
    expect(parsed?.target).toBe(12);
  });
});
