import { describe, expect, it } from "vitest";
import { qualifyAccount } from "@/domain/qualification";
import { evaluateScopeOfPractice } from "@/domain/scopeOfPractice";
import { buildDailyVisitList, parseAccountNameList } from "@/domain/visitList";
import { generatePreVisitBrief, seasonFromDate, seasonalPitchOrder } from "@/domain/brief";
import { TAXONOMY } from "@/domain/taxonomy";
import { PRODUCTS } from "@/domain/products";
import { ALLOWED_LEAD_PRODUCTS } from "@/domain/terminology";
import type { ProspectCandidate } from "@/domain/visitList";

const baseCredentials = {
  hasPhysicianOrNp: true,
  hasRn: false,
  hasNd: false,
  hasImg: false,
  hasAllied: false,
  physicianOrNpOnSiteForPrp: true,
  rnHasPhysicianDirective: false,
};

describe("taxonomy", () => {
  it("has six segments with exact category counts from the spec", () => {
    expect(TAXONOMY).toHaveLength(6);
    expect(TAXONOMY.map((s) => s.categories.length)).toEqual([12, 6, 6, 8, 6, 7]);
    expect(TAXONOMY[0]!.categories[0]!.label).toBe("Plastic & cosmetic surgery clinic");
  });
});

describe("products", () => {
  it("never allows Mesoestetic as a recommendable lead", () => {
    const meso = PRODUCTS.find((p) => p.code === "MESOESTETIC");
    expect(meso?.mayRecommendAsLead).toBe(false);
    expect(meso?.isActivePortfolio).toBe(false);
    expect(ALLOWED_LEAD_PRODUCTS.join(" ")).not.toMatch(/Mesoestetic/i);
  });
});

describe("qualification", () => {
  it("excludes Do-Not-Contact accounts", () => {
    const result = qualifyAccount({
      businessName: "DNC Clinic",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryNumber: 1,
      categoryLabel: "Plastic & cosmetic surgery clinic",
      organizationTypeLabel: "Independent",
      credentials: baseCredentials,
      advertisesThreadLifting: true,
      pricePositioning: "premium",
      formerMesoesteticCustomer: false,
      doNotContact: true,
      hasAcademyAccount: false,
      aptosPathway: "NONE",
      injectablesOffered: "yes",
      threadsOffered: "PDO",
      skincareLines: "unknown",
    });
    expect(result.excluded).toBe(true);
    expect(result.exclusionReason).toBe("Do-Not-Contact");
  });

  it("recommends Dermaceutic for former Mesoestetic customers, never Mesoestetic", () => {
    const result = qualifyAccount({
      businessName: "Former Meso",
      provinceCode: "ON",
      segmentNumber: 3,
      categoryNumber: 3,
      categoryLabel: "Laser & skin clinic",
      organizationTypeLabel: "Independent",
      credentials: baseCredentials,
      advertisesThreadLifting: false,
      pricePositioning: "mid",
      formerMesoesteticCustomer: true,
      doNotContact: false,
      hasAcademyAccount: true,
      aptosPathway: "NONE",
      injectablesOffered: "yes",
      threadsOffered: "none",
      skincareLines: "former Mesoestetic",
    });
    expect(result.excluded).toBe(false);
    expect(result.recommendedLeadProduct).toBe("DERMACEUTIC");
    expect(result.recommendedLeadProductLabel).toBe("Dermaceutic");
    expect(result.openingAngle.toLowerCase()).toContain("mesoestetic");
  });

  it("scores physician thread advertiser highly", () => {
    const result = qualifyAccount({
      businessName: "Thread Clinic",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryNumber: 2,
      categoryLabel: "Dermatology clinic, medical and/or cosmetic",
      organizationTypeLabel: "Independent",
      credentials: baseCredentials,
      advertisesThreadLifting: true,
      pricePositioning: "premium",
      formerMesoesteticCustomer: false,
      doNotContact: false,
      hasAcademyAccount: false,
      aptosPathway: "NONE",
      injectablesOffered: "yes",
      threadsOffered: "PDO",
      skincareLines: "UNKNOWN, verify",
    });
    expect(result.fitScore).toBeGreaterThanOrEqual(4);
    expect(["APTOS", "APTOS_3_LEVEL_CERTIFICATION"]).toContain(result.recommendedLeadProduct);
  });
});

describe("scope of practice", () => {
  it("allows ND threads in BC and blocks ND threads in ON (assumption A4)", () => {
    const nd = {
      hasPhysicianOrNp: false,
      hasRn: false,
      hasNd: true,
      hasImg: false,
      hasAllied: false,
      physicianOrNpOnSiteForPrp: false,
      rnHasPhysicianDirective: false,
    };
    expect(evaluateScopeOfPractice("BC", nd).aptosProductAllowed).toBe(true);
    expect(evaluateScopeOfPractice("ON", nd).aptosProductAllowed).toBe(false);
  });

  it("blocks PRP without physician/NP on site", () => {
    const scope = evaluateScopeOfPractice("ON", {
      hasPhysicianOrNp: false,
      hasRn: true,
      hasNd: false,
      hasImg: false,
      hasAllied: false,
      physicianOrNpOnSiteForPrp: false,
      rnHasPhysicianDirective: false,
    });
    expect(scope.fidiaAllowed).toBe(false);
    expect(scope.skincareAllowed).toBe(true);
  });
});

describe("visit list", () => {
  const candidates: ProspectCandidate[] = [
    {
      id: "a",
      businessName: "Near Clinic",
      parentGroupName: null,
      organizationTypeLabel: "Independent",
      segmentNumber: 1,
      categoryNumber: 3,
      categoryLabel: "Physician-led cosmetic medicine clinic (GP/family physician)",
      streetAddress: "1 Near St",
      city: "Toronto",
      provinceCode: "ON",
      postalCode: "M5V 1A1",
      latitude: 43.65,
      longitude: -79.38,
      googleMapsUrl: null,
      placeId: "a",
      dataCompleteness: "needs_verification",
      qualificationInput: {
        credentials: baseCredentials,
        advertisesThreadLifting: false,
        pricePositioning: "mid",
        formerMesoesteticCustomer: false,
        doNotContact: false,
        hasAcademyAccount: false,
        aptosPathway: "NONE",
        injectablesOffered: "yes",
        threadsOffered: "none",
        skincareLines: "UNKNOWN, verify",
      },
    },
    {
      id: "b",
      businessName: "Far Clinic",
      parentGroupName: null,
      organizationTypeLabel: "Independent",
      segmentNumber: 1,
      categoryNumber: 3,
      categoryLabel: "Physician-led cosmetic medicine clinic (GP/family physician)",
      streetAddress: "2 Far St",
      city: "Toronto",
      provinceCode: "ON",
      postalCode: "M4P 1A1",
      latitude: 43.72,
      longitude: -79.4,
      googleMapsUrl: null,
      placeId: "b",
      dataCompleteness: "needs_verification",
      qualificationInput: {
        credentials: baseCredentials,
        advertisesThreadLifting: true,
        pricePositioning: "premium",
        formerMesoesteticCustomer: false,
        doNotContact: false,
        hasAcademyAccount: false,
        aptosPathway: "NONE",
        injectablesOffered: "yes",
        threadsOffered: "PDO",
        skincareLines: "UNKNOWN, verify",
      },
    },
  ];

  it("orders geographically nearest first and labels revisits", () => {
    const result = buildDailyVisitList(
      {
        provinceCode: "ON",
        startPoint: { lat: 43.65, lng: -79.38 },
        dailyVisitTarget: 20,
        maxRadiusKm: 40,
        minFitScore: 3,
        alreadyVisitedNames: [],
        revisitNames: ["Far Clinic"],
      },
      candidates,
    );
    expect(result.entries[0]!.businessName).toBe("Near Clinic");
    expect(result.entries.find((e) => e.businessName === "Far Clinic")?.isRevisit).toBe(true);
  });

  it("excludes already visited names", () => {
    const result = buildDailyVisitList(
      {
        provinceCode: "ON",
        startPoint: { lat: 43.65, lng: -79.38 },
        dailyVisitTarget: 20,
        maxRadiusKm: 40,
        minFitScore: 3,
        alreadyVisitedNames: parseAccountNameList("Near Clinic"),
        revisitNames: [],
      },
      candidates,
    );
    expect(result.entries.map((e) => e.businessName)).not.toContain("Near Clinic");
  });
});

describe("pre-visit brief", () => {
  it("uses seasonal pitch order from the spec and never leads with Mesoestetic", () => {
    expect(seasonFromDate(new Date("2026-08-15T12:00:00Z"))).toBe("SUMMER");
    expect(seasonalPitchOrder("SUMMER")[0]).toContain("GESKE");

    const brief = generatePreVisitBrief({
      ctx: {
        accountId: "x",
        accountName: "Mock Clinic",
        segmentNumber: 1,
        categoryLabel: "Dermatology clinic, medical and/or cosmetic",
        organizationTypeLabel: "Independent",
        provinceCode: "ON",
        leadProduct: "APTOS",
        openingAngle: "test",
        formerMesoesteticCustomer: true,
        aptosProductAllowed: true,
        serviceMenuSummary: "UNKNOWN, verify",
        skincareLines: "UNKNOWN, verify",
        practitionersSummary: "MD",
        pricePositioning: "mid",
        googleReviewCount: null,
        thinPublicData: true,
      },
      visitDate: new Date("2026-08-15T12:00:00Z"),
      visitType: "first visit",
      lastVisitNotes: null,
    });

    expect(brief.leadProductForVisit).toBe("Dermaceutic");
    expect(brief.doNotSay.some((l) => /Mesoestetic/i.test(l))).toBe(true);
    expect(brief.fiveQuestions).toHaveLength(5);
    expect(brief.signalsToReadOnSite).toHaveLength(5);
  });
});
