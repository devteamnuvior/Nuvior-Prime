/**
 * End-to-end pipeline helper — gap analysis + opportunity scoring.
 */

import { runGapAnalysisForFixture } from "@/domain/gap/gapTestHelpers";
import type { GapCrmContext } from "@/domain/gap/gapContext";
import { credentialsFromProfile } from "@/domain/gap";
import { MOCK_CATALOG_FIXTURES, MOCK_CATALOG_VERSION } from "@/providers/productCatalog/mockCatalogFixtures";
import { buildResearchContext } from "@/domain/research/buildContext";
import { runClinicResearch } from "@/domain/research/runResearch";
import { MockResearchProvider } from "@/providers/research/mockResearchProvider";
import { DEFAULT_GAP_CRM_CONTEXT } from "@/domain/gap/gapContext";
import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";
import { scoreProductOpportunities } from "./scoreProductOpportunities";
import type { ProductOpportunityAnalysis } from "./productOpportunityAnalysis";
import type { OpportunityCrmExtensions } from "./opportunityContext";

export async function runOpportunityScoringForFixture(input: {
  fixtureId: string;
  provinceCode?: string;
  credentials?: AccountCredentialSignals;
  crm?: Partial<GapCrmContext>;
  crmExtensions?: OpportunityCrmExtensions;
  accountFitScore?: number | null;
}): Promise<ProductOpportunityAnalysis> {
  const gapAnalysis = await runGapAnalysisForFixture({
    fixtureId: input.fixtureId,
    provinceCode: input.provinceCode,
    credentials: input.credentials,
    crm: input.crm,
  });

  const ctx = buildResearchContext({
    clinicId: input.fixtureId,
    businessName: input.fixtureId,
    provinceCode: input.provinceCode ?? "ON",
    segmentNumber: 1,
    categoryLabel: "Opportunity test fixture",
    websiteUrl: null,
    rawPages: [],
  });
  const research = await runClinicResearch(new MockResearchProvider(), ctx);
  if (!research.ok) throw new Error(research.error);

  const credentials =
    input.credentials ?? credentialsFromProfile(research.profile);

  return scoreProductOpportunities({
    gapAnalysis,
    catalog: MOCK_CATALOG_FIXTURES,
    catalogVersion: MOCK_CATALOG_VERSION,
    provinceCode: input.provinceCode ?? "ON",
    credentials,
    crm: { ...DEFAULT_GAP_CRM_CONTEXT, ...input.crm },
    crmExtensions: input.crmExtensions,
    accountFitScore: input.accountFitScore ?? null,
  });
}
