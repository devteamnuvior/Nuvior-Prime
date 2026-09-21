import { describe, expect, it } from "vitest";
import { CATALOG_PRODUCT_IDS } from "@/domain/products/leadProductCompat";
import {
  scoreProductOpportunities,
  PRODUCT_OPPORTUNITY_SCORING_VERSION,
  aggregateGapsByProduct,
  computeScoreComponents,
  opportunityAnalysisCacheKey,
} from "@/domain/opportunity";
import { runGapAnalysisForFixture } from "@/domain/gap/gapTestHelpers";
import { runOpportunityScoringForFixture } from "@/domain/opportunity/opportunityTestHelpers";
import { OPPORTUNITY_VALIDATION_SCENARIOS } from "@/domain/opportunity/opportunityScenarios";
import { MOCK_CATALOG_FIXTURES, MOCK_CATALOG_VERSION } from "@/providers/productCatalog/mockCatalogFixtures";
import { DEFAULT_GAP_CRM_CONTEXT } from "@/domain/gap/gapContext";
import { credentialsFromProfile } from "@/domain/gap";
import { buildResearchContext } from "@/domain/research/buildContext";
import { runClinicResearch } from "@/domain/research/runResearch";
import { MockResearchProvider } from "@/providers/research/mockResearchProvider";
import { isOpportunityAnalysisStale } from "@/lib/opportunityPersistence";

describe("ProductOpportunity scoring determinism", () => {
  it("returns identical analysis for identical inputs", async () => {
    const gapAnalysis = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    const fixed = "2026-09-01T12:00:00.000Z";
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

    const base = {
      gapAnalysis,
      catalog: MOCK_CATALOG_FIXTURES,
      catalogVersion: MOCK_CATALOG_VERSION,
      provinceCode: "ON",
      credentials: credentialsFromProfile(research.profile),
      crm: DEFAULT_GAP_CRM_CONTEXT,
      analyzedAt: fixed,
    };
    expect(scoreProductOpportunities(base)).toEqual(scoreProductOpportunities(base));
  });

  it("persists scoring rules version", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    expect(analysis.scoringRulesVersion).toBe(PRODUCT_OPPORTUNITY_SCORING_VERSION);
  });

  it("exposes inspectable score components", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    const opp = analysis.opportunities[0];
    expect(opp?.scoreComponents.total).toBe(opp?.opportunityScore);
    expect(opp?.scoreComponents).toMatchObject({
      gapStrengthPoints: expect.any(Number),
      adjacencyPoints: expect.any(Number),
      evidencePoints: expect.any(Number),
      crmModifier: expect.any(Number),
      uncertaintyPenalty: expect.any(Number),
      total: expect.any(Number),
    });
  });
});

describe("Case A — Aptos/training ranks highest", () => {
  it("ranks certification at or above Aptos threads", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    const cert = analysis.opportunities.find(
      (o) => o.productId === CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION,
    );
    const threads = analysis.opportunities.find(
      (o) => o.productId === CATALOG_PRODUCT_IDS.APTOS,
    );
    expect(cert).toBeDefined();
    expect(threads).toBeDefined();
    expect(cert!.opportunityScore).toBeGreaterThanOrEqual(threads!.opportunityScore);
    expect(analysis.primaryProductId).toBe(CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION);
  });
});

describe("Case B — threads present", () => {
  it("does not win on missing-thread logic alone", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-threads-clinic",
    });
    const threads = analysis.opportunities.find(
      (o) => o.productId === CATALOG_PRODUCT_IDS.APTOS,
    );
    expect(threads).toBeUndefined();
    expect(analysis.primaryProductId).toBeNull();
  });
});

describe("Case C — Dermaceutic", () => {
  it("ranks Dermaceutic strongly", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-skincare-brands",
    });
    const derm = analysis.opportunities.find(
      (o) => o.productId === CATALOG_PRODUCT_IDS.DERMACEUTIC,
    );
    expect(derm).toBeDefined();
    expect(derm!.opportunityScore).toBeGreaterThanOrEqual(50);
    expect(analysis.primaryProductId).toBe(CATALOG_PRODUCT_IDS.DERMACEUTIC);
  });
});

describe("Case D — Fidia PRP", () => {
  it("ranks Fidia strongly for PRP clinic", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-prp-clinic",
    });
    const fidia = analysis.opportunities.find(
      (o) => o.productId === CATALOG_PRODUCT_IDS.FIDIA_HY_TISSUE_PRP,
    );
    expect(fidia).toBeDefined();
    expect(fidia!.opportunityScore).toBeGreaterThanOrEqual(40);
  });
});

describe("Case E — GESKE", () => {
  it("ranks GESKE strongly for retail/spa fixture", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-spa-retail",
    });
    expect(analysis.primaryProductId).toBe(CATALOG_PRODUCT_IDS.GESKE);
  });
});

describe("Case F — former Meso", () => {
  it("boosts Dermaceutic via CRM modifier", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-sparse-website",
      crm: { formerMesoesteticCustomer: true },
    });
    const derm = analysis.opportunities.find(
      (o) => o.productId === CATALOG_PRODUCT_IDS.DERMACEUTIC,
    );
    expect(derm!.scoreComponents.crmModifier).toBeGreaterThan(0);
    expect(analysis.primaryProductId).toBe(CATALOG_PRODUCT_IDS.DERMACEUTIC);
  });
});

describe("Case G — sparse site", () => {
  it("does not force high-confidence primary", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-sparse-website",
    });
    expect(analysis.primaryProductId).toBeNull();
    expect(analysis.primaryRecommendationStatus).toBe("NONE");
  });
});

describe("Case H — scope blocked", () => {
  it("blocks Aptos opportunities", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
      provinceCode: "ON",
      credentials: {
        hasPhysicianOrNp: false,
        hasRn: false,
        hasNd: true,
        hasImg: false,
        hasAllied: false,
        physicianOrNpOnSiteForPrp: false,
        rnHasPhysicianDirective: false,
      },
    });
    const aptosBlocked = analysis.blockedOpportunities.some(
      (b) => b.productFamily === "APTOS",
    );
    expect(aptosBlocked || analysis.opportunities.every((o) => o.productFamily !== "APTOS")).toBe(
      true,
    );
    expect(analysis.primaryProductId).toBeNull();
  });
});

describe("Case I — training prerequisite", () => {
  it("certification outranks direct Aptos product", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
      crm: { aptosCertificationLevel: null, hasAcademyAccount: false },
    });
    expect(analysis.primaryProductId).toBe(CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION);
  });
});

describe("aggregation from multiple gaps", () => {
  it("merges gaps into one product opportunity", async () => {
    const gapAnalysis = await runGapAnalysisForFixture({
      fixtureId: "fixture-skincare-brands",
      crm: { formerMesoesteticCustomer: true },
    });
    const buckets = aggregateGapsByProduct(gapAnalysis.gaps);
    const dermBucket = buckets.find((b) => b.productId === CATALOG_PRODUCT_IDS.DERMACEUTIC);
    expect(dermBucket!.gaps.length).toBeGreaterThanOrEqual(1);
  });
});

describe("hard gates", () => {
  it("blocks Mesoestetic from opportunities", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-skincare-brands",
    });
    expect(
      analysis.opportunities.every(
        (o) => o.productId !== CATALOG_PRODUCT_IDS.MESOESTETIC_HISTORICAL,
      ),
    ).toBe(true);
    expect(
      analysis.blockedOpportunities.every(
        (b) => b.productId !== CATALOG_PRODUCT_IDS.MESOESTETIC_HISTORICAL,
      ),
    ).toBe(true);
  });

  it("blocks inactive products", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    expect(analysis.opportunities.every((o) => o.productId !== "nuvior-aptos-legacy-kit")).toBe(
      true,
    );
  });
});

describe("DNC behavior", () => {
  it("computes opportunities but blocks actionable primary", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
      crm: { doNotContact: true },
    });
    expect(analysis.opportunities.length).toBeGreaterThan(0);
    expect(analysis.primaryOpportunityId).toBeNull();
    expect(analysis.primaryRecommendationStatus).toBe("BLOCKED_DNC");
    expect(analysis.opportunities.every((o) => o.eligibilityState === "BLOCKED_DNC")).toBe(true);
  });
});

describe("confidence separate from score", () => {
  it("allows high score with medium confidence", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    const threads = analysis.opportunities.find(
      (o) => o.productId === CATALOG_PRODUCT_IDS.APTOS,
    );
    if (threads && threads.opportunityScore >= 50) {
      expect(threads.confidence).toBe("MEDIUM");
    }
  });
});

describe("pending verification primary", () => {
  it("marks primary pending when verification required", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    expect(["PENDING_VERIFICATION", "CONFIRMED"]).toContain(
      analysis.primaryRecommendationStatus,
    );
    const primary = analysis.opportunities.find((o) => o.isPrimary);
    if (primary?.verificationRequired) {
      expect(analysis.primaryRecommendationStatus).toBe("PENDING_VERIFICATION");
    }
  });
});

describe("Account Fit separation", () => {
  it("stores accountFitScore without affecting ranking", async () => {
    const a = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
      accountFitScore: 3,
    });
    const b = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
      accountFitScore: 5,
    });
    expect(a.accountFitScore).toBe(3);
    expect(b.accountFitScore).toBe(5);
    expect(a.opportunities.map((o) => o.opportunityScore)).toEqual(
      b.opportunities.map((o) => o.opportunityScore),
    );
  });
});

describe("cache invalidation", () => {
  it("detects stale opportunity analysis", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    expect(
      isOpportunityAnalysisStale(
        analysis,
        "different-gap-version",
        analysis.catalogVersion,
        analysis.crmContextHash!,
      ),
    ).toBe(true);
  });

  it("builds stable cache key", async () => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: "fixture-injectable-clinic",
    });
    const key = opportunityAnalysisCacheKey({
      gapAnalysisVersion: analysis.gapAnalysisVersion,
      catalogVersion: analysis.catalogVersion,
      scoringRulesVersion: analysis.scoringRulesVersion,
      crmContextHash: analysis.crmContextHash!,
    });
    expect(key).toContain(PRODUCT_OPPORTUNITY_SCORING_VERSION);
  });
});

describe("score component reproducibility", () => {
  it("components sum to total within clamp", async () => {
    const gapAnalysis = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    const product = MOCK_CATALOG_FIXTURES.find((p) => p.id === CATALOG_PRODUCT_IDS.APTOS)!;
    const gaps = gapAnalysis.gaps.filter((g) =>
      g.relevantProductIds.includes(CATALOG_PRODUCT_IDS.APTOS),
    );
    const evidenceById = new Map(gapAnalysis.evidenceRefs.map((e) => [e.id, e]));
    const c = computeScoreComponents(product, gaps, DEFAULT_GAP_CRM_CONTEXT, undefined, evidenceById);
    expect(c.total).toBeLessThanOrEqual(100);
    expect(c.total).toBeGreaterThanOrEqual(0);
  });
});

describe("validation scenarios", () => {
  it.each(OPPORTUNITY_VALIDATION_SCENARIOS)("$id", async (scenario) => {
    const analysis = await runOpportunityScoringForFixture({
      fixtureId: scenario.fixtureId,
      provinceCode: scenario.provinceCode,
      credentials: scenario.credentials,
      crm: scenario.crm,
    });

    if (scenario.expectNoPrimary) {
      expect(analysis.primaryProductId).toBeNull();
    }
    if (scenario.expectPrimaryProductId) {
      expect(analysis.primaryProductId).toBe(scenario.expectPrimaryProductId);
    }
    if (scenario.expectTopProductIds?.length) {
      const topId = analysis.opportunities[0]?.productId;
      expect(scenario.expectTopProductIds).toContain(topId);
    }
    if (scenario.expectBlockedFamilies) {
      for (const fam of scenario.expectBlockedFamilies) {
        const blocked = analysis.blockedOpportunities.some((b) => b.productFamily === fam);
        const noEligible = !analysis.opportunities.some(
          (o) => o.productFamily === fam && o.eligibilityState === "ELIGIBLE",
        );
        expect(blocked || noEligible).toBe(true);
      }
    }
  });
});
