import { describe, expect, it } from "vitest";
import { CATALOG_PRODUCT_IDS } from "@/domain/products/leadProductCompat";
import {
  analyzeProductGaps,
  APPROVED_PRODUCT_COMPARISONS,
  credentialsFromProfile,
  DEFAULT_GAP_CRM_CONTEXT,
  gapAnalysisCacheKey,
  PRODUCT_GAP_RULES_VERSION,
} from "@/domain/gap";
import { buildProfileInventory, getCapabilityState } from "@/domain/gap/profileInventory";
import { MOCK_CATALOG_FIXTURES, MOCK_CATALOG_VERSION } from "@/providers/productCatalog/mockCatalogFixtures";
import { buildResearchContext } from "@/domain/research/buildContext";
import { runClinicResearch } from "@/domain/research/runResearch";
import { MockResearchProvider } from "@/providers/research/mockResearchProvider";
import { runGapAnalysisForFixture } from "@/domain/gap/gapTestHelpers";
import { GAP_VALIDATION_SCENARIOS } from "@/domain/gap/gapScenarios";
import { isGapAnalysisStale } from "@/lib/gapPersistence";

async function profileFor(fixtureId: string) {
  const ctx = buildResearchContext({
    clinicId: fixtureId,
    businessName: fixtureId,
    provinceCode: "ON",
    segmentNumber: 1,
    categoryLabel: "Test",
    websiteUrl: null,
    rawPages: [],
  });
  const result = await runClinicResearch(new MockResearchProvider(), ctx);
  if (!result.ok) throw new Error(result.error);
  return result.profile;
}

describe("ProductGapEngine determinism", () => {
  it("returns identical analysis for identical inputs", async () => {
    const fixed = "2026-09-01T12:00:00.000Z";
    const profile = await profileFor("fixture-injectable-clinic");
    const base = {
      profile,
      catalog: MOCK_CATALOG_FIXTURES,
      catalogVersion: MOCK_CATALOG_VERSION,
      provinceCode: "ON",
      credentials: credentialsFromProfile(profile),
      crm: DEFAULT_GAP_CRM_CONTEXT,
      analyzedAt: fixed,
    };
    const a = analyzeProductGaps(base);
    const b = analyzeProductGaps(base);
    expect(a).toEqual(b);
  });

  it("persists rule version on analysis", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    expect(analysis.gapRulesVersion).toBe(PRODUCT_GAP_RULES_VERSION);
  });

  it("never emits primary recommendation or opportunity score", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    expect(analysis.hasPrimaryRecommendation).toBe(false);
    expect(analysis.hasOpportunityScore).toBe(false);
    expect(analysis.gaps.every((g) => !("opportunityScore" in g))).toBe(true);
  });
});

describe("Case A — strong Aptos capability gap", () => {
  it("detects THREAD_LIFTING gap with verification", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    const threadGap = analysis.gaps.find(
      (g) => g.capability === "THREAD_LIFTING" && g.gapType === "CAPABILITY_GAP",
    );
    expect(threadGap).toBeDefined();
    expect(threadGap!.clinicInventoryState).toBe("NOT_FOUND");
    expect(threadGap!.relevantProductIds).toContain(CATALOG_PRODUCT_IDS.APTOS);
    expect(threadGap!.verificationRequired).toBe(true);
    expect(threadGap!.verificationQuestion).toMatch(/thread lifting/i);
    expect(threadGap!.explanationData.adjacencyRuleId).toBe("aptos-thread-from-injectables");
  });
});

describe("Case B — threads present", () => {
  it("does not create simple thread capability gap", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-threads-clinic" });
    const threadGap = analysis.gaps.find(
      (g) => g.capability === "THREAD_LIFTING" && g.gapType === "CAPABILITY_GAP",
    );
    expect(threadGap).toBeUndefined();
  });
});

describe("Case C — Dermaceutic product-line gap", () => {
  it("detects PRODUCT_LINE_GAP with competitor skincare", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-skincare-brands" });
    const lineGap = analysis.gaps.find((g) => g.gapType === "PRODUCT_LINE_GAP");
    expect(lineGap).toBeDefined();
    expect(lineGap!.relevantProductIds).toContain(CATALOG_PRODUCT_IDS.DERMACEUTIC);
    expect(lineGap!.relevantProductIds).not.toContain(CATALOG_PRODUCT_IDS.MESOESTETIC_HISTORICAL);
  });
});

describe("Case D — PRP Fidia line", () => {
  it("creates product-line candidate without upgrade language", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-prp-clinic" });
    const prpGap = analysis.gaps.find(
      (g) =>
        g.gapType === "PRODUCT_LINE_GAP" &&
        g.relevantProductIds.includes(CATALOG_PRODUCT_IDS.FIDIA_HY_TISSUE_PRP),
    );
    expect(prpGap).toBeDefined();
    expect(analysis.gaps.every((g) => g.gapType !== "UPGRADE_OPPORTUNITY")).toBe(true);
  });
});

describe("Case E — GESKE retail", () => {
  it("detects retail device capability gap", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-spa-retail" });
    const geskeGap = analysis.gaps.find(
      (g) => g.capability === "RETAIL_BEAUTY_DEVICE" && g.gapType === "CAPABILITY_GAP",
    );
    expect(geskeGap).toBeDefined();
    expect(geskeGap!.relevantProductIds).toContain(CATALOG_PRODUCT_IDS.GESKE);
  });
});

describe("Case F — former Meso retention", () => {
  it("creates RETENTION_GAP toward Dermaceutic only", async () => {
    const analysis = await runGapAnalysisForFixture({
      fixtureId: "fixture-sparse-website",
      crm: { formerMesoesteticCustomer: true },
    });
    const retention = analysis.gaps.find((g) => g.gapType === "RETENTION_GAP");
    expect(retention).toBeDefined();
    expect(retention!.relevantProductIds).toEqual([CATALOG_PRODUCT_IDS.DERMACEUTIC]);
    expect(retention!.explanationData.crmTrigger).toBe("former_mesoestetic_customer");
  });
});

describe("Case G — sparse website", () => {
  it("produces no clear gap reasons", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-sparse-website" });
    expect(analysis.gaps.length).toBe(0);
    expect(analysis.noClearGapReasons.length).toBeGreaterThan(0);
  });
});

describe("Case H — scope blocked", () => {
  it("blocks Aptos capability gap for ND-only ON", async () => {
    const analysis = await runGapAnalysisForFixture({
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
    const threadGap = analysis.gaps.find(
      (g) => g.capability === "THREAD_LIFTING" && g.gapType === "CAPABILITY_GAP",
    );
    expect(threadGap).toBeUndefined();
  });
});

describe("Case I — training gap", () => {
  it("creates TRAINING_GAP when certification missing", async () => {
    const analysis = await runGapAnalysisForFixture({
      fixtureId: "fixture-injectable-clinic",
      crm: { aptosCertificationLevel: null, hasAcademyAccount: false },
    });
    const training = analysis.gaps.find((g) => g.gapType === "TRAINING_GAP");
    expect(training).toBeDefined();
    expect(training!.relevantProductIds[0]).toBe(CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION);
  });
});

describe("inventory state semantics", () => {
  it("CONFIRMED_PRESENT blocks capability gap for same capability", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-threads-clinic" });
    expect(
      analysis.gaps.some(
        (g) => g.capability === "THREAD_LIFTING" && g.gapType === "CAPABILITY_GAP",
      ),
    ).toBe(false);
  });

  it("CONFIRMED_ABSENT supports stronger gap signal when adjacency exists", async () => {
    const profile = await profileFor("fixture-injectable-clinic");
    const threadItem = profile.capabilities.find((c) => c.capabilityTag === "THREAD_LIFTING");
    expect(threadItem).toBeDefined();
    const patched = {
      ...profile,
      capabilities: profile.capabilities.map((c) =>
        c.capabilityTag === "THREAD_LIFTING"
          ? { ...c, inventoryState: "CONFIRMED_ABSENT" as const }
          : c,
      ),
    };
    const analysis = analyzeProductGaps({
      profile: patched,
      catalog: MOCK_CATALOG_FIXTURES,
      catalogVersion: MOCK_CATALOG_VERSION,
      provinceCode: "ON",
      credentials: {
        hasPhysicianOrNp: true,
        hasRn: false,
        hasNd: false,
        hasImg: false,
        hasAllied: false,
        physicianOrNpOnSiteForPrp: true,
        rnHasPhysicianDirective: false,
      },
      crm: DEFAULT_GAP_CRM_CONTEXT,
    });
    const absentGap = analysis.gaps.find(
      (g) => g.capability === "THREAD_LIFTING" && g.clinicInventoryState === "CONFIRMED_ABSENT",
    );
    expect(absentGap?.confidence).toBe("HIGH");
  });

  it("UNKNOWN does not produce strong capability gap", async () => {
    const profile = await profileFor("fixture-no-information");
    const inventory = buildProfileInventory(profile);
    expect(getCapabilityState(inventory, "THREAD_LIFTING")).toBe("UNKNOWN");
    const analysis = analyzeProductGaps({
      profile,
      catalog: MOCK_CATALOG_FIXTURES,
      catalogVersion: MOCK_CATALOG_VERSION,
      provinceCode: "ON",
      credentials: credentialsFromProfile(profile),
      crm: DEFAULT_GAP_CRM_CONTEXT,
    });
    expect(analysis.gaps.filter((g) => g.capability === "THREAD_LIFTING")).toHaveLength(0);
  });
});

describe("catalog eligibility", () => {
  it("excludes inactive and non-sellable products from gaps", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    for (const g of analysis.gaps) {
      expect(g.relevantProductIds).not.toContain("nuvior-aptos-legacy-kit");
      expect(g.relevantProductIds).not.toContain("nuvior-geske-wholesale-only");
    }
  });

  it("never recommends Mesoestetic in relevantProductIds", async () => {
    const analysis = await runGapAnalysisForFixture({
      fixtureId: "fixture-skincare-brands",
      crm: { formerMesoesteticCustomer: true },
    });
    for (const g of analysis.gaps) {
      expect(g.relevantProductIds).not.toContain(CATALOG_PRODUCT_IDS.MESOESTETIC_HISTORICAL);
    }
  });
});

describe("UPGRADE_OPPORTUNITY blocked", () => {
  it("remains unavailable without approved comparison KB", () => {
    expect(APPROVED_PRODUCT_COMPARISONS.size).toBe(0);
  });
});

describe("CRM DNC", () => {
  it("marks gaps BLOCKED_DNC without removing gap detection", async () => {
    const analysis = await runGapAnalysisForFixture({
      fixtureId: "fixture-injectable-clinic",
      crm: { doNotContact: true },
    });
    const gap = analysis.gaps.find((g) => g.gapType === "CAPABILITY_GAP");
    expect(gap?.eligibilityState).toBe("BLOCKED_DNC");
  });
});

describe("cross-sell", () => {
  it("creates CROSS_SELL_OPPORTUNITY for existing NUVIOR customer", async () => {
    const analysis = await runGapAnalysisForFixture({
      fixtureId: "fixture-injectable-clinic",
      crm: { existingNuviorCustomer: true, activeNuviorFamilies: ["DERMACEUTIC"] },
    });
    expect(analysis.gaps.some((g) => g.gapType === "CROSS_SELL_OPPORTUNITY")).toBe(true);
  });
});

describe("cache invalidation", () => {
  it("detects stale analysis when catalog version changes", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    expect(
      isGapAnalysisStale(analysis, analysis.profileVersion, "different-catalog", analysis.crmContextHash!),
    ).toBe(true);
  });

  it("builds stable cache key from versions", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    const key = gapAnalysisCacheKey({
      profileVersion: analysis.profileVersion,
      catalogVersion: analysis.catalogVersion,
      gapRulesVersion: analysis.gapRulesVersion,
      crmContextHash: analysis.crmContextHash!,
    });
    expect(key).toContain(analysis.profileVersion);
  });
});

describe("validation scenarios", () => {
  it.each(GAP_VALIDATION_SCENARIOS)("$id — $label", async (scenario) => {
    const analysis = await runGapAnalysisForFixture({
      fixtureId: scenario.fixtureId,
      provinceCode: scenario.provinceCode,
      credentials: scenario.credentials,
      crm: scenario.crm,
    });

    if (scenario.expectNoClearGap) {
      expect(analysis.noClearGapReasons.length).toBeGreaterThan(0);
    }
    if (scenario.expectGapTypes) {
      for (const t of scenario.expectGapTypes) {
        expect(analysis.gaps.some((g) => g.gapType === t)).toBe(true);
      }
    }
    if (scenario.expectNoGapForCapability) {
      expect(
        analysis.gaps.some(
          (g) =>
            g.capability === scenario.expectNoGapForCapability && g.gapType === "CAPABILITY_GAP",
        ),
      ).toBe(false);
    }
    if (scenario.expectNoGaps) {
      expect(analysis.gaps).toHaveLength(0);
    }
  });
});

describe("evidence linking", () => {
  it("includes evidence refs on capability gaps", async () => {
    const analysis = await runGapAnalysisForFixture({ fixtureId: "fixture-injectable-clinic" });
    const gap = analysis.gaps.find((g) => g.gapType === "CAPABILITY_GAP");
    expect(gap!.evidenceRefIds.length).toBeGreaterThan(0);
    expect(analysis.evidenceRefs.length).toBeGreaterThan(0);
  });
});
