import { describe, expect, it } from "vitest";
import { buildDailyVisitList, type ProspectCandidate } from "./visitList";

const creds = {
  hasPhysicianOrNp: true,
  hasRn: false,
  hasNd: false,
  hasImg: false,
  hasAllied: false,
  physicianOrNpOnSiteForPrp: true,
  rnHasPhysicianDirective: false,
};

function cand(id: string, lat: number): ProspectCandidate {
  return {
    id,
    businessName: `Clinic ${id}`,
    parentGroupName: null,
    streetAddress: "1 St",
    city: "Toronto",
    provinceCode: "ON",
    postalCode: "M5V 1A1",
    latitude: lat,
    longitude: -79.39,
    googleMapsUrl: null,
    placeId: id,
    dataCompleteness: "needs_verification",
    qualificationInput: {
      credentials: creds,
      advertisesThreadLifting: true,
      pricePositioning: "premium",
      formerMesoesteticCustomer: false,
      doNotContact: false,
      hasAcademyAccount: null,
      aptosPathway: "NONE",
      injectablesOffered: "yes",
      threadsOffered: "PDO",
      skincareLines: "unknown",
    },
  };
}

const request = {
  provinceCode: "ON",
  startPoint: { lat: 43.64, lng: -79.39 },
  dailyVisitTarget: 3,
  maxRadiusKm: 40,
  minFitScore: 1,
  alreadyVisitedNames: [],
  revisitNames: [],
};

describe("team visits on the daily list", () => {
  // Five clinics, nearest first: a, b, c, d, e.
  const candidates = ["a", "b", "c", "d", "e"].map((id, i) => cand(id, 43.64 + i * 0.01));

  it("skips clinics the team visited recently, shows them as visited and fills the day with the next ones", () => {
    const r = buildDailyVisitList(
      {
        ...request,
        teamVisits: {
          a: { visitedOn: "2026-11-03", byUserId: "me", byName: "Ontario Rep", mine: true },
          c: { visitedOn: "2026-10-28", byUserId: "u2", byName: "Toronto Rep B", mine: false },
        },
      },
      candidates,
    );
    expect(r.entries.map((e) => e.accountId)).toEqual(["b", "d", "e"]);
    expect(r.visitedNearby.map((v) => [v.accountId, v.visitedBy, v.mine])).toEqual([
      ["a", "You", true],
      ["c", "Toronto Rep B", false],
    ]);
    expect(r.qualifiedPool.map((e) => e.accountId)).not.toContain("a");
  });

  it("keeps a clinic the CRM says is due for a revisit even if the team visited it", () => {
    const r = buildDailyVisitList(
      {
        ...request,
        crmRevisitKeys: ["a"],
        teamVisits: { a: { visitedOn: "2026-10-01", byUserId: "u2", byName: "Toronto Rep B", mine: false } },
      },
      candidates,
    );
    expect(r.entries.map((e) => e.accountId)).toEqual(["a", "b", "c"]);
    expect(r.entries[0]?.isRevisit).toBe(true);
    expect(r.visitedNearby).toEqual([]);
  });

  it("without team visits nothing is marked", () => {
    const r = buildDailyVisitList(request, candidates);
    expect(r.entries.map((e) => e.accountId)).toEqual(["a", "b", "c"]);
    expect(r.visitedNearby).toEqual([]);
  });
});
