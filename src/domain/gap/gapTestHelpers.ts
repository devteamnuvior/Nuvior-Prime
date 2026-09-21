/**
 * Test/validation helpers — research profile + gap analysis pipeline.
 */

import { buildResearchContext } from "@/domain/research/buildContext";
import { runClinicResearch } from "@/domain/research/runResearch";
import { MockResearchProvider } from "@/providers/research/mockResearchProvider";
import { MOCK_CATALOG_FIXTURES, MOCK_CATALOG_VERSION } from "@/providers/productCatalog/mockCatalogFixtures";
import {
  analyzeProductGaps,
  credentialsFromProfile,
  DEFAULT_GAP_CRM_CONTEXT,
  type GapCrmContext,
} from "@/domain/gap";
import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";
import type { ProductGapAnalysis } from "@/domain/gap/productGapAnalysis";

export async function runGapAnalysisForFixture(input: {
  fixtureId: string;
  provinceCode?: string;
  credentials?: AccountCredentialSignals;
  crm?: Partial<GapCrmContext>;
}): Promise<ProductGapAnalysis> {
  const ctx = buildResearchContext({
    clinicId: input.fixtureId,
    businessName: input.fixtureId,
    provinceCode: input.provinceCode ?? "ON",
    segmentNumber: 1,
    categoryLabel: "Gap test fixture",
    websiteUrl: "https://example-clinic.ca",
    rawPages: [],
  });

  const research = await runClinicResearch(new MockResearchProvider(), ctx);
  if (!research.ok) throw new Error(research.error);

  const credentials =
    input.credentials ?? credentialsFromProfile(research.profile);

  return analyzeProductGaps({
    profile: research.profile,
    catalog: MOCK_CATALOG_FIXTURES,
    catalogVersion: MOCK_CATALOG_VERSION,
    provinceCode: input.provinceCode ?? "ON",
    credentials,
    crm: { ...DEFAULT_GAP_CRM_CONTEXT, ...input.crm },
  });
}
