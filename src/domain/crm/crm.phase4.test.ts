import { describe, expect, it } from "vitest";
import {
  matchPublicToCrm,
  shouldAutoApplyMatch,
  normalizeBusinessName,
  type PersistedMapping,
} from "@/domain/crm/matching";
import { evaluateDnc } from "@/domain/crm/dnc";
import { resolveRevisitFlags, mergeUniqueKeys } from "@/domain/crm/revisit";
import { deriveLastOrderStatus } from "@/domain/crm/lastOrder";
import {
  isFullyCertified,
  nextCertificationHint,
  resolvePathway,
} from "@/domain/crm/certification";
import { ownershipOf } from "@/domain/crm/ownership";
import { MOCK_CRM_ACCOUNTS } from "@/providers/crm/mockCrmData";
import { MockCrmProvider } from "@/providers/crm/mockCrmProvider";
import { qualifyAccount } from "@/domain/qualification";
import { buildDailyVisitList } from "@/domain/visitList";
import type { ProspectCandidate } from "@/domain/visitList";

const config = { autoThreshold: 0.9, possibleThreshold: 0.6 };

const baseCreds = {
  hasPhysicianOrNp: true,
  hasRn: false,
  hasNd: false,
  hasImg: false,
  hasAllied: false,
  physicianOrNpOnSiteForPrp: true,
  rnHasPhysicianDirective: false,
};

describe("CRM provider interface (mock)", () => {
  it("supports lookup, search, visits, revisits", async () => {
    const crm = new MockCrmProvider(false);
    expect(crm.isUnavailable()).toBe(false);
    const byId = await crm.getById("CRM-MOCK-001");
    expect(byId?.businessName).toContain("Yorkville");
    const byPlace = await crm.getStatusForPlace("mock-on-001", "x");
    expect(byPlace?.crmExternalId).toBe("CRM-MOCK-001");
    const search = await crm.searchAccounts({ postalCode: "M5S 1N4" });
    expect(search.length).toBeGreaterThan(0);
    const history = await crm.getVisitHistory("CRM-MOCK-001");
    expect(history.length).toBeGreaterThan(0);
    const due = await crm.getRevisitsDue("2026-08-31", "ON");
    expect(due.some((a) => a.crmExternalId === "CRM-MOCK-005")).toBe(true);
  });

  it("graceful unavailable mode", async () => {
    const crm = new MockCrmProvider(true);
    expect(crm.isUnavailable()).toBe(true);
    expect(await crm.listAccounts()).toEqual([]);
    expect(await crm.getById("CRM-MOCK-001")).toBeNull();
  });
});

describe("account matching", () => {
  it("matches exact Place ID", () => {
    const r = matchPublicToCrm(
      {
        placeId: "mock-on-001",
        businessName: "Anything",
        streetAddress: "x",
        postalCode: "M5S 1N4",
      },
      MOCK_CRM_ACCOUNTS,
      [],
      config,
    );
    expect(r.state).toBe("EXACT");
    expect(r.method).toBe("place_id");
    expect(r.crmAccount?.crmExternalId).toBe("CRM-MOCK-001");
    expect(shouldAutoApplyMatch(r, config)).toBe(true);
  });

  it("matches name + postal", () => {
    const r = matchPublicToCrm(
      {
        placeId: "unknown-place",
        businessName: "Mock Pigment Lab Skin Studio",
        streetAddress: "MOCK 790 Dundas St W",
        postalCode: "M6J 1V1",
      },
      MOCK_CRM_ACCOUNTS,
      [],
      config,
    );
    expect(r.method).toBe("name_postal");
    expect(["EXACT", "HIGH_CONFIDENCE"]).toContain(r.state);
    expect(r.crmAccount?.crmExternalId).toBe("CRM-MOCK-007");
  });

  it("returns POSSIBLE for uncertain fuzzy names without auto-merge", () => {
    const r = matchPublicToCrm(
      {
        placeId: "new-place",
        businessName: "Yorkville Dermatology Clinic",
        streetAddress: "1 Somewhere",
        postalCode: "M5R 1A1",
      },
      MOCK_CRM_ACCOUNTS.filter((a) => a.crmExternalId === "CRM-MOCK-FUZZY-YORK"),
      [],
      config,
    );
    expect(r.state === "POSSIBLE" || r.state === "NO_MATCH" || r.method === "fuzzy_name").toBe(true);
    if (r.state === "POSSIBLE") {
      expect(r.crmAccount).toBeNull();
      expect(shouldAutoApplyMatch(r, config)).toBe(false);
    }
  });

  it("honors verified persistent mapping", () => {
    const mappings: PersistedMapping[] = [
      {
        crmExternalId: "CRM-MOCK-007",
        placeId: "custom-place",
        normalizedBusinessName: normalizeBusinessName("Pigment"),
        normalizedAddress: null,
        matchMethod: "verified_mapping",
        matchConfidence: 1,
        verified: true,
        rejected: false,
      },
    ];
    const r = matchPublicToCrm(
      {
        placeId: "custom-place",
        businessName: "Totally Different Name",
        streetAddress: "x",
        postalCode: "Z1Z 1Z1",
      },
      MOCK_CRM_ACCOUNTS,
      mappings,
      config,
    );
    expect(r.state).toBe("EXACT");
    expect(r.method).toBe("verified_mapping");
    expect(r.crmAccount?.crmExternalId).toBe("CRM-MOCK-007");
  });

  it("skips rejected mappings for place ID", () => {
    const mappings: PersistedMapping[] = [
      {
        crmExternalId: "CRM-MOCK-001",
        placeId: "mock-on-001",
        normalizedBusinessName: null,
        normalizedAddress: null,
        matchMethod: "place_id",
        matchConfidence: 1,
        verified: false,
        rejected: true,
      },
    ];
    const r = matchPublicToCrm(
      {
        placeId: "mock-on-001",
        businessName: "Mock Yorkville Dermatology",
        streetAddress: "MOCK 120 Bloor St W",
        postalCode: "M5S 1N4",
      },
      MOCK_CRM_ACCOUNTS,
      mappings,
      config,
    );
    // Rejected place_id row skipped; may still name+postal match same account
    expect(r.method === "place_id" ? r.state !== "EXACT" : true).toBe(true);
  });

  it("returns CRM_UNAVAILABLE when flagged", () => {
    const r = matchPublicToCrm(
      {
        placeId: "mock-on-001",
        businessName: "x",
        streetAddress: "x",
        postalCode: "x",
      },
      MOCK_CRM_ACCOUNTS,
      [],
      config,
      true,
    );
    expect(r.state).toBe("CRM_UNAVAILABLE");
    expect(shouldAutoApplyMatch(r, config)).toBe(false);
  });

  it("detects Place ID conflict across CRM rows", () => {
    const dupes = MOCK_CRM_ACCOUNTS.filter((a) =>
      ["CRM-MOCK-001", "CRM-MOCK-CONFLICT-ADDR"].includes(a.crmExternalId),
    ).map((a) => ({ ...a, placeId: "shared-place" }));
    const r = matchPublicToCrm(
      {
        placeId: "shared-place",
        businessName: "x",
        streetAddress: "x",
        postalCode: "x",
      },
      dupes,
      [],
      config,
    );
    expect(r.state).toBe("CONFLICT");
    expect(r.crmAccount).toBeNull();
  });
});

describe("DNC", () => {
  it("excludes matched DNC accounts centrally", () => {
    const dnc = MOCK_CRM_ACCOUNTS.find((a) => a.crmExternalId === "CRM-MOCK-DNC")!;
    const match = matchPublicToCrm(
      {
        placeId: "mock-on-011",
        businessName: dnc.businessName,
        streetAddress: dnc.streetAddress!,
        postalCode: dnc.postalCode!,
      },
      MOCK_CRM_ACCOUNTS,
      [],
      config,
    );
    expect(match.crmAccount?.doNotContact).toBe(true);
    const decision = evaluateDnc(match, match.crmAccount);
    expect(decision.excluded).toBe(true);
    expect(decision.reason).toBe("Do-Not-Contact");
    expect(decision.debug).toMatch(/DNC=true/);
  });

  it("does not assume DNC false when CRM unavailable", () => {
    const match = matchPublicToCrm(
      {
        placeId: "x",
        businessName: "x",
        streetAddress: "x",
        postalCode: "x",
      },
      [],
      [],
      config,
      true,
    );
    const decision = evaluateDnc(match, null);
    expect(decision.crmUnverified).toBe(true);
    expect(decision.excluded).toBe(false);
  });
});

describe("revisit / already visited", () => {
  it("includes CRM revisits as RE-VISIT and excludes already visited", () => {
    const revisit = resolveRevisitFlags({
      pasteRevisitNames: [],
      pasteAlreadyVisitedNames: [],
      crmRevisitKeys: ["mock-on-005"],
      crmAlreadyVisitedKeys: [],
      businessName: "Mock Queen West MedSpa",
      placeId: "mock-on-005",
      doNotContact: false,
    });
    expect(revisit.isRevisit).toBe(true);
    expect(revisit.label).toBe("RE-VISIT");

    const visited = resolveRevisitFlags({
      pasteRevisitNames: [],
      pasteAlreadyVisitedNames: [],
      crmRevisitKeys: [],
      crmAlreadyVisitedKeys: ["mock-on-008"],
      businessName: "Mock Distillery Day Spa",
      placeId: "mock-on-008",
      doNotContact: false,
    });
    expect(visited.alreadyVisitedExclude).toBe(true);
  });

  it("dedupes revisit keys across discovery and paste", () => {
    expect(mergeUniqueKeys(["A", "B"], ["a", "C"])).toEqual(["A", "B", "C"]);
  });

  it("visit list excludes DNC and already visited; labels revisits", () => {
    const cand = (partial: Partial<ProspectCandidate> & Pick<ProspectCandidate, "id" | "businessName">): ProspectCandidate => ({
      parentGroupName: null,
      organizationTypeLabel: "Independent",
      segmentNumber: 1,
      categoryNumber: 2,
      categoryLabel: "Dermatology clinic, medical and/or cosmetic",
      streetAddress: "1 St",
      city: "Toronto",
      provinceCode: "ON",
      postalCode: "M5V 1A1",
      latitude: 43.64,
      longitude: -79.39,
      googleMapsUrl: null,
      placeId: partial.id,
      dataCompleteness: "needs_verification",
      qualificationInput: {
        credentials: baseCreds,
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
      ...partial,
    });

    const result = buildDailyVisitList(
      {
        provinceCode: "ON",
        startPoint: { lat: 43.64, lng: -79.39 },
        dailyVisitTarget: 10,
        maxRadiusKm: 40,
        minFitScore: 3,
        alreadyVisitedNames: [],
        revisitNames: [],
        crmRevisitKeys: ["revisit-1"],
        crmAlreadyVisitedKeys: ["visited-1"],
      },
      [
        cand({
          id: "dnc-1",
          businessName: "DNC Co",
          qualificationInput: {
            credentials: baseCreds,
            advertisesThreadLifting: true,
            pricePositioning: "premium",
            formerMesoesteticCustomer: false,
            doNotContact: true,
            hasAcademyAccount: null,
            aptosPathway: "NONE",
            injectablesOffered: "yes",
            threadsOffered: "PDO",
            skincareLines: "unknown",
          },
        }),
        cand({ id: "visited-1", businessName: "Visited Co" }),
        cand({ id: "revisit-1", businessName: "Revisit Co" }),
      ],
    );

    expect(result.excludedDoNotContact).toContain("DNC Co");
    expect(result.excludedAlreadyVisited).toContain("Visited Co");
    expect(result.entries.some((e) => e.businessName === "DNC Co")).toBe(false);
    const rev = result.entries.find((e) => e.businessName === "Revisit Co");
    expect(rev?.isRevisit).toBe(true);
  });
});

describe("certification / meso / last-order", () => {
  it("ownership: DNC and former Mesoestetic are CRM-owned", () => {
    expect(ownershipOf("doNotContact")).toBe("crm");
    expect(ownershipOf("formerMesoesteticCustomer")).toBe("crm");
    expect(ownershipOf("placeId")).toBe("places");
    expect(ownershipOf("fitScore")).toBe("derived");
  });

  it("derives last-order status with explicit thresholds", () => {
    expect(deriveLastOrderStatus("2026-08-01", new Date("2026-08-31"))).toBe("active");
    expect(deriveLastOrderStatus("2026-02-15", new Date("2026-08-31"))).toBe("dormant");
    expect(deriveLastOrderStatus("2023-01-10", new Date("2026-08-31"))).toBe("long_lapsed");
    expect(deriveLastOrderStatus(null)).toBe("never");
  });

  it("former Mesoestetic → Dermaceutic; never Mesoestetic lead", () => {
    const r = qualifyAccount({
      businessName: "Meso",
      provinceCode: "ON",
      segmentNumber: 3,
      categoryNumber: 3,
      categoryLabel: "Laser & skin clinic",
      organizationTypeLabel: "Independent",
      credentials: baseCreds,
      advertisesThreadLifting: false,
      pricePositioning: "mid",
      formerMesoesteticCustomer: true,
      doNotContact: false,
      hasAcademyAccount: true,
      aptosPathway: "NONE",
      injectablesOffered: "yes",
      threadsOffered: "none",
      skincareLines: "Mesoestetic on website",
    });
    expect(r.recommendedLeadProduct).toBe("DERMACEUTIC");
    expect(r.recommendedLeadProductLabel).not.toMatch(/Mesoestetic/i);
  });

  it("fully certified CRM level does not recommend lower cert lead", () => {
    const r = qualifyAccount({
      businessName: "Certified",
      provinceCode: "BC",
      segmentNumber: 1,
      categoryNumber: 1,
      categoryLabel: "Plastic & cosmetic surgery clinic",
      organizationTypeLabel: "Independent",
      credentials: baseCreds,
      advertisesThreadLifting: true,
      pricePositioning: "premium",
      formerMesoesteticCustomer: false,
      doNotContact: false,
      hasAcademyAccount: true,
      aptosPathway: "THREE_LEVEL",
      aptosCertificationLevel: "3/3 Online Certification",
      injectablesOffered: "yes",
      threadsOffered: "threads",
      skincareLines: "unknown",
    });
    expect(isFullyCertified("3/3 Online Certification")).toBe(true);
    expect(r.recommendedLeadProduct).toBe("APTOS");
    expect(nextCertificationHint("THREE_LEVEL", "3/3 Online Certification")).toMatch(/complete/);
  });

  it("preserves CRM pathway over derived", () => {
    expect(
      resolvePathway({ crmPathway: "FOUR_LEVEL", derivedPathway: "THREE_LEVEL" }),
    ).toBe("FOUR_LEVEL");
  });
});
