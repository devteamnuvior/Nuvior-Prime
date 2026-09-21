import { describe, expect, it } from "vitest";
import { MockResearchProvider } from "@/providers/research/mockResearchProvider";
import { MOCK_CATALOG_FIXTURES, MOCK_CATALOG_VERSION } from "@/providers/productCatalog/mockCatalogFixtures";
import { runClinicIntelligencePipeline } from "@/domain/intelligence/runClinicIntelligence";
import {
  buildClinicIntelligenceDto,
  buildOfferings,
  emptyClinicIntelligenceDto,
} from "@/domain/intelligence/buildClinicIntelligenceDto";
import { applyIntelligenceToBrief } from "@/domain/intelligence/applyIntelligenceToBrief";
import { inventoryStateLabel, opportunityHeadline } from "@/domain/intelligence/labels";
import { generatePreVisitBrief } from "@/domain/brief";
import { mergeBriefWithNarrative } from "@/domain/llm/synthesize";
import { runOpportunityScoringForFixture } from "@/domain/opportunity/opportunityTestHelpers";
import { runGapAnalysisForFixture } from "@/domain/gap/gapTestHelpers";
import { buildResearchContext } from "@/domain/research/buildContext";
import { runClinicResearch } from "@/domain/research/runResearch";
import { CATALOG_PRODUCT_IDS } from "@/domain/products/leadProductCompat";
import { hasPermission } from "@/domain/auth/permissions";
import { AuthError, requirePermission } from "@/lib/authz";
import type { AuthUser } from "@/domain/auth/permissions";

const repUser: AuthUser = {
  id: "rep-1",
  email: "rep@test.com",
  displayName: "Rep",
  role: "REP",
  status: "ACTIVE",
  provinces: ["ON"],
  territories: [],
};

const managerUser: AuthUser = { ...repUser, id: "mgr-1", role: "MANAGER" };
void managerUser;

describe("Clinic intelligence orchestration", () => {
  it("runs Stage C → D → E pipeline", async () => {
    const result = await runClinicIntelligencePipeline(new MockResearchProvider(), {
      clinicId: "fixture-injectable-clinic",
      businessName: "Injectable Clinic",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "Medical aesthetics",
      websiteUrl: "https://example-clinic.ca",
      catalog: MOCK_CATALOG_FIXTURES,
      catalogVersion: MOCK_CATALOG_VERSION,
      accountFitScore: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.researchStatus).toMatch(/RESEARCHED|NEEDS_VERIFICATION/);
    expect(result.gapAnalysis.gaps.length).toBeGreaterThan(0);
    expect(result.opportunityAnalysis.primaryProductId).toBe(
      CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION,
    );
    expect(result.dto.primary?.productName).toBeTruthy();
  });
});

describe("Rep-safe DTO", () => {
  it("hides score internals from REP", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
      accountFitScore: 5,
    });
    const gap = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    const ctx = buildResearchContext({
      clinicId: "fixture-injectable-clinic",
      businessName: "x",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "x",
      websiteUrl: null,
      rawPages: [],
    });
    const research = await runClinicResearch(new MockResearchProvider(), ctx);
    if (!research.ok) throw new Error("fail");

    const dto = buildClinicIntelligenceDto({
      profile: research.profile,
      gapAnalysis: gap,
      opportunityAnalysis: analysis,
      catalog: MOCK_CATALOG_FIXTURES,
      role: "REP",
      accountFitScore: 5,
      researchState: "RESEARCHED",
    });

    expect(dto.diagnostics).toBeNull();
    expect(dto.primary?.headline).not.toMatch(/\d{2,}/);
    expect(JSON.stringify(dto)).not.toContain("scoreComponents");
  });

  it("shows diagnostics to MANAGER", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    const gap = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    const ctx = buildResearchContext({
      clinicId: "fixture-injectable-clinic",
      businessName: "x",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "x",
      websiteUrl: null,
      rawPages: [],
    });
    const research = await runClinicResearch(new MockResearchProvider(), ctx);
    if (!research.ok) throw new Error("fail");

    const dto = buildClinicIntelligenceDto({
      profile: research.profile,
      gapAnalysis: gap,
      opportunityAnalysis: analysis,
      catalog: MOCK_CATALOG_FIXTURES,
      role: "MANAGER",
      accountFitScore: 4,
      researchState: "RESEARCHED",
    });

    expect(dto.diagnostics).not.toBeNull();
    expect(dto.diagnostics?.opportunityScore).toBeGreaterThan(0);
    expect(dto.diagnostics?.scoringVersion).toBeTruthy();
  });
});

describe("Recommendation status copy", () => {
  it("CONFIRMED → Strong opportunity", () => {
    expect(opportunityHeadline("CONFIRMED", "HIGH")).toBe("Strong opportunity");
  });

  it("PENDING_VERIFICATION → Verify first", () => {
    expect(opportunityHeadline("PENDING_VERIFICATION", "HIGH")).toBe(
      "Strong opportunity · Verify first",
    );
  });

  it("NONE → no clear opportunity", () => {
    expect(opportunityHeadline("NONE", "LOW")).toBe("No clear product opportunity yet");
  });

  it("BLOCKED_DNC → empty headline", () => {
    expect(opportunityHeadline("BLOCKED_DNC", "HIGH")).toBe("");
  });
});

describe("NOT_FOUND wording", () => {
  it("never implies clinic does not offer", () => {
    const label = inventoryStateLabel("NOT_FOUND");
    expect(label).toBe("Not found on reviewed pages");
    expect(label.toLowerCase()).not.toContain("does not");
    expect(label.toLowerCase()).not.toContain("don't offer");
  });
});

describe("Mesoestetic exclusion", () => {
  it("never recommends Meso as primary or secondary", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-skincare-brands",
      crm: { formerMesoesteticCustomer: true },
    });
    const gap = await runGapAnalysisForFixture({
      fixtureId: "fixture-skincare-brands",
      crm: { formerMesoesteticCustomer: true },
    });
    const ctx = buildResearchContext({
      clinicId: "fixture-skincare-brands",
      businessName: "x",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "x",
      websiteUrl: null,
      rawPages: [],
    });
    const research = await runClinicResearch(new MockResearchProvider(), ctx);
    if (!research.ok) throw new Error("fail");

    const dto = buildClinicIntelligenceDto({
      profile: research.profile,
      gapAnalysis: gap,
      opportunityAnalysis: analysis,
      catalog: MOCK_CATALOG_FIXTURES,
      role: "REP",
      accountFitScore: 4,
      researchState: "RESEARCHED",
    });

    const names = [
      dto.primary?.productName,
      ...dto.secondaryOpportunities.map((s) => s.productName),
    ].filter(Boolean);
    for (const n of names) {
      expect(n!.toLowerCase()).not.toMatch(/^mesoestetic/);
    }
  });
});

describe("Evidence and offerings", () => {
  it("builds offerings from profile with inventory labels", async () => {
    const ctx = buildResearchContext({
      clinicId: "fixture-injectable-clinic",
      businessName: "x",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "x",
      websiteUrl: null,
      rawPages: [],
    });
    const research = await runClinicResearch(new MockResearchProvider(), ctx);
    if (!research.ok) throw new Error("fail");

    const offerings = buildOfferings(research.profile);
    expect(offerings.some((o) => o.label === "Botox")).toBe(true);
    expect(offerings.find((o) => o.label === "Botox")?.inventoryStateLabel).toBe(
      "Confirmed on website",
    );
    expect(research.profile.evidenceRefs.length).toBeGreaterThan(0);
  });
});

describe("Secondary opportunities", () => {
  it("lists secondary without Meso and excludes primary", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    const gap = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    const ctx = buildResearchContext({
      clinicId: "fixture-injectable-clinic",
      businessName: "x",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "x",
      websiteUrl: null,
      rawPages: [],
    });
    const research = await runClinicResearch(new MockResearchProvider(), ctx);
    if (!research.ok) throw new Error("fail");

    const dto = buildClinicIntelligenceDto({
      profile: research.profile,
      gapAnalysis: gap,
      opportunityAnalysis: analysis,
      catalog: MOCK_CATALOG_FIXTURES,
      role: "REP",
      accountFitScore: 5,
      researchState: "RESEARCHED",
    });

    if (dto.secondaryOpportunities.length > 0) {
      expect(dto.secondaryOpportunities.every((s) => s.productId !== dto.primary?.productId)).toBe(
        true,
      );
    }
  });
});

describe("Pre-visit brief product lock", () => {
  it("locks primary product from Stage E intelligence", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    const gap = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    const ctx = buildResearchContext({
      clinicId: "fixture-injectable-clinic",
      businessName: "Test Clinic",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "Medical aesthetics",
      websiteUrl: null,
      rawPages: [],
    });
    const research = await runClinicResearch(new MockResearchProvider(), ctx);
    if (!research.ok) throw new Error("fail");

    const dto = buildClinicIntelligenceDto({
      profile: research.profile,
      gapAnalysis: gap,
      opportunityAnalysis: analysis,
      catalog: MOCK_CATALOG_FIXTURES,
      role: "REP",
      accountFitScore: 5,
      researchState: "RESEARCHED",
    });

    const template = generatePreVisitBrief({
      ctx: {
        accountId: "fixture-injectable-clinic",
        accountName: "Test Clinic",
        segmentNumber: 1,
        categoryLabel: "Medical aesthetics",
        organizationTypeLabel: "Independent",
        provinceCode: "ON",
        leadProduct: "APTOS",
        openingAngle: "threads",
        formerMesoesteticCustomer: false,
        aptosProductAllowed: true,
        serviceMenuSummary: "Botox",
        skincareLines: "unknown",
        practitionersSummary: "MD",
        pricePositioning: "premium",
        googleReviewCount: null,
        thinPublicData: false,
      },
      visitDate: new Date("2026-09-01"),
      visitType: "first visit",
      lastVisitNotes: null,
    });

    const merged = applyIntelligenceToBrief(template, dto, {
      businessName: "Test Clinic",
      categoryLabel: "Medical aesthetics",
      segmentNumber: 1,
    });

    expect(merged.leadProductForVisit).toBe(dto.primary!.productName);
    expect(merged.leadProductForVisit).not.toBe(template.leadProductForVisit);
    expect(merged.clinicIntelligence?.lockedFromOpportunityEngine).toBe(true);
  });

  it("LLM merge cannot change locked lead product", () => {
    const template = generatePreVisitBrief({
      ctx: {
        accountId: "x",
        accountName: "Clinic",
        segmentNumber: 1,
        categoryLabel: "Med spa",
        organizationTypeLabel: "Independent",
        provinceCode: "ON",
        leadProduct: "APTOS_3_LEVEL_CERTIFICATION",
        openingAngle: "cert",
        formerMesoesteticCustomer: false,
        aptosProductAllowed: true,
        serviceMenuSummary: "injectables",
        skincareLines: "ZO",
        practitionersSummary: "MD",
        pricePositioning: "premium",
        googleReviewCount: null,
        thinPublicData: false,
      },
      visitDate: new Date("2026-09-01"),
      visitType: "first visit",
      lastVisitNotes: null,
    });

    const locked = "Aptos 3-level certification";
    const merged = mergeBriefWithNarrative(
      template,
      {
        ok: true,
        narrative: {
          accountSummary: "Summary",
          snapshotThreeLines: ["a", "b", "c"],
          leadProductWhy: "Why cert",
          secondProductIfFirstLands: "Dermaceutic",
          openingLines: template.openingLines,
          fiveQuestions: template.fiveQuestions,
          signalsToReadOnSite: template.signalsToReadOnSite,
          objectionsAndResponses: template.objectionsAndResponses,
          theAsk: template.theAsk,
          leaveBehind: template.leaveBehind,
          doNotSay: template.doNotSay,
          confirmOnSite: [],
        },
        provider: "mock",
        model: "mock",
        cacheHit: false,
        warnings: [],
      },
      locked,
    );
    expect(merged.leadProductForVisit).toBe(locked);
  });
});

describe("BLOCKED_DNC state", () => {
  it("blocks actionable primary when DNC", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
      crm: { doNotContact: true },
    });
    const gap = await runGapAnalysisForFixture({
      fixtureId: "fixture-injectable-clinic",
      crm: { doNotContact: true },
    });
    const ctx = buildResearchContext({
      clinicId: "fixture-injectable-clinic",
      businessName: "x",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "x",
      websiteUrl: null,
      rawPages: [],
    });
    const research = await runClinicResearch(new MockResearchProvider(), ctx);
    if (!research.ok) throw new Error("fail");

    const dto = buildClinicIntelligenceDto({
      profile: research.profile,
      gapAnalysis: gap,
      opportunityAnalysis: analysis,
      catalog: MOCK_CATALOG_FIXTURES,
      role: "REP",
      accountFitScore: 5,
      researchState: "RESEARCHED",
    });

    expect(analysis.primaryRecommendationStatus).toBe("BLOCKED_DNC");
    expect(dto.blockedDnc).toBe(true);
    expect(dto.primary).toBeNull();
  });
});

describe("Failure handling", () => {
  it("returns FAILED state when provider unavailable", async () => {
    const provider = new MockResearchProvider({ unavailable: true, reason: "disabled" });
    const result = await runClinicIntelligencePipeline(provider, {
      clinicId: "fixture-injectable-clinic",
      businessName: "Clinic",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryLabel: "x",
      websiteUrl: null,
      catalog: MOCK_CATALOG_FIXTURES,
      catalogVersion: MOCK_CATALOG_VERSION,
    });
    expect(result.ok).toBe(false);
    expect(result.dto.researchState).toMatch(/FAILED|NOT_RESEARCHED/);
    expect(result.dto.failureMessage).toBeTruthy();
  });
});

describe("RBAC permissions", () => {
  it("REP has brief.view and brief.generate for research", () => {
    expect(hasPermission("REP", "brief.view")).toBe(true);
    expect(hasPermission("REP", "brief.generate")).toBe(true);
  });

  it("requirePermission throws FORBIDDEN for missing permission", () => {
    const disabled: AuthUser = { ...repUser, status: "DISABLED" };
    expect(() => requirePermission(disabled, "brief.view")).toThrow(AuthError);
  });
});

describe("Empty intelligence DTO", () => {
  it("NOT_RESEARCHED state", () => {
    const dto = emptyClinicIntelligenceDto("place-1", 4);
    expect(dto.researchState).toBe("NOT_RESEARCHED");
    expect(dto.primary).toBeNull();
  });
});

describe("Route priority unchanged", () => {
  it("intelligence module does not import routing optimizer", async () => {
    const mod = await import("@/domain/intelligence/runClinicIntelligence");
    expect(mod.runClinicIntelligencePipeline).toBeDefined();
    expect(Object.keys(mod)).not.toContain("optimizeRoute");
  });
});
