import { describe, expect, it } from "vitest";
import { qualifyAccount } from "@/domain/qualification";
import { evaluateScopeOfPractice } from "@/domain/scopeOfPractice";
import { buildDailyVisitList, parseAccountNameList } from "@/domain/visitList";
import { generatePreVisitBrief, seasonFromDate, seasonalPitchOrder } from "@/domain/brief";
import { PRODUCTS } from "@/domain/products";
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

describe("products", () => {
  it("keeps Mesoestetic out of the active portfolio", () => {
    const meso = PRODUCTS.find((p) => p.code === "MESOESTETIC");
    expect(meso?.isActivePortfolio).toBe(false);
  });
});

describe("qualification", () => {
  it("excludes Do-Not-Contact accounts", () => {
    const result = qualifyAccount({
      businessName: "DNC Clinic",
      provinceCode: "ON",
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

  it("uses the Mesoestetic opening angle for former Mesoestetic customers", () => {
    const result = qualifyAccount({
      businessName: "Former Meso",
      provinceCode: "ON",
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
    expect(result.openingAngle.toLowerCase()).toContain("mesoestetic");
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
        alreadyVisitedNames: parseAccountNameList("Near Clinic"),
        revisitNames: [],
      },
      candidates,
    );
    expect(result.entries.map((e) => e.businessName)).not.toContain("Near Clinic");
  });
});

describe("pre-visit brief", () => {
  it("uses seasonal pitch order from the spec and never promises Mesoestetic", () => {
    expect(seasonFromDate(new Date("2026-08-15T12:00:00Z"))).toBe("SUMMER");
    expect(seasonalPitchOrder("SUMMER")[0]).toContain("GESKE");

    const brief = generatePreVisitBrief({
      ctx: {
        accountId: "x",
        accountName: "Mock Clinic",
        provinceCode: "ON",
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

    expect(brief.doNotSay.some((l) => /Mesoestetic/i.test(l))).toBe(true);
    expect(brief.fiveQuestions).toHaveLength(5);
    expect(brief.signalsToReadOnSite).toHaveLength(5);
  });
});
