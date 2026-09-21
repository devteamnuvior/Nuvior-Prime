/**
 * On-demand clinic intelligence orchestrator — Stage C → D → E.
 * Does not alter routing, Account Fit, gap rules, or scoring weights.
 */

import { analyzeProductGaps } from "@/domain/gap/analyzeProductGapsCore";
import {
  credentialsFromProfile,
  DEFAULT_GAP_CRM_CONTEXT,
  hashGapCrmContext,
  type GapCrmContext,
} from "@/domain/gap/gapContext";
import type { ProductGapAnalysis } from "@/domain/gap/productGapAnalysis";
import { PRODUCT_GAP_RULES_VERSION } from "@/domain/gap/productGapAnalysis";
import { scoreProductOpportunities } from "@/domain/opportunity/scoreProductOpportunities";
import type { ProductOpportunityAnalysis } from "@/domain/opportunity/productOpportunityAnalysis";
import type { OpportunityCrmExtensions } from "@/domain/opportunity/opportunityContext";
import { PRODUCT_OPPORTUNITY_SCORING_VERSION } from "@/domain/opportunity/scoringConfig";
import { buildResearchContext } from "@/domain/research/buildContext";
import { computeSourceVersion } from "@/domain/research/clinicResearchContext";
import type { ClinicCapabilityProfile } from "@/domain/research/clinicCapabilityProfile";
import { runClinicResearch } from "@/domain/research/runResearch";
import type { EnrichmentResult } from "@/domain/enrichment/types";
import type { NuviorProduct } from "@/domain/products/nuviorProduct";
import type { ResearchProvider } from "@/providers/research/types";
import { gapAnalysisCacheKey } from "@/domain/gap/gapContext";
import {
  gapAnalysisVersionHash,
  opportunityAnalysisCacheKey,
} from "@/domain/opportunity/opportunityContext";
import {
  getPersistedGapAnalysis,
  isGapAnalysisStale,
  persistGapAnalysis,
} from "@/lib/gapPersistence";
import {
  getPersistedOpportunityAnalysis,
  isOpportunityAnalysisStale,
  persistOpportunityAnalysis,
} from "@/lib/opportunityPersistence";
import { getResearchConfig } from "@/lib/researchConfig";
import {
  getPersistedResearchProfile,
  getResearchProfileByClinicId,
  isResearchProfileStale,
} from "@/lib/researchPersistence";
import {
  buildClinicIntelligenceDto,
  emptyClinicIntelligenceDto,
} from "./buildClinicIntelligenceDto";
import type { ClinicIntelligenceDto } from "./clinicIntelligenceDto";

export type ClinicIntelligenceInput = {
  clinicId: string;
  businessName: string;
  provinceCode: string;
  segmentNumber: number;
  categoryLabel: string;
  websiteUrl: string | null;
  enrichment?: EnrichmentResult | null;
  rawPages?: { url: string; title: string | null; bodyText: string; retrievedAt: string }[];
  crm?: GapCrmContext;
  crmExtensions?: OpportunityCrmExtensions;
  credentials?: import("@/domain/scopeOfPractice").AccountCredentialSignals;
  accountFitScore?: number | null;
  catalog: NuviorProduct[];
  catalogVersion: string;
  forceRefresh?: boolean;
};

export type ClinicIntelligenceResult =
  | { ok: true; dto: ClinicIntelligenceDto; profile: ClinicCapabilityProfile; gapAnalysis: ProductGapAnalysis; opportunityAnalysis: ProductOpportunityAnalysis }
  | { ok: false; dto: ClinicIntelligenceDto; error: string };

function researchUiState(profile: ClinicCapabilityProfile | null, stale: boolean): ClinicIntelligenceDto["researchState"] {
  if (!profile) return "NOT_RESEARCHED";
  if (stale) return "STALE";
  if (profile.researchStatus === "FAILED") return "FAILED";
  if (profile.researchStatus === "NEEDS_VERIFICATION") return "NEEDS_VERIFICATION";
  return "RESEARCHED";
}

export async function runClinicIntelligencePipeline(
  provider: ResearchProvider,
  input: ClinicIntelligenceInput,
): Promise<ClinicIntelligenceResult> {
  const cfg = getResearchConfig();
  const crm = input.crm ?? DEFAULT_GAP_CRM_CONTEXT;
  const crmHash = hashGapCrmContext(crm);

  const researchContext = buildResearchContext({
    clinicId: input.clinicId,
    businessName: input.businessName,
    provinceCode: input.provinceCode,
    segmentNumber: input.segmentNumber,
    categoryLabel: input.categoryLabel,
    websiteUrl: input.websiteUrl,
    enrichment: input.enrichment ?? null,
    rawPages: input.rawPages ?? [],
  });

  const sourceVersion = computeSourceVersion(researchContext.pages, researchContext.promptVersion);
  let profile: ClinicCapabilityProfile | null = null;
  let sourceStale = false;

  if (!input.forceRefresh) {
    profile = await getPersistedResearchProfile(
      input.clinicId,
      sourceVersion,
      researchContext.promptVersion,
    );
    if (!profile) {
      const anyProfile = await getResearchProfileByClinicId(input.clinicId);
      if (anyProfile) {
        sourceStale = isResearchProfileStale(anyProfile, sourceVersion, researchContext.promptVersion);
        if (!sourceStale) profile = anyProfile;
      }
    }
  } else {
    sourceStale = true;
  }

  if (!profile || sourceStale || input.forceRefresh) {
    const research = await runClinicResearch(provider, researchContext);
    if (!research.ok) {
      return {
        ok: false,
        error: research.error,
        dto: {
          ...emptyClinicIntelligenceDto(input.clinicId, input.accountFitScore ?? null),
          researchState: research.status === "FAILED" ? "FAILED" : "NOT_RESEARCHED",
          failureMessage: research.error,
        },
      };
    }
    profile = research.profile;
    sourceStale = false;
  }

  const credentials = input.credentials ?? credentialsFromProfile(profile);
  const gapCacheKey = gapAnalysisCacheKey({
    profileVersion: profile.sourceVersion,
    catalogVersion: input.catalogVersion,
    gapRulesVersion: PRODUCT_GAP_RULES_VERSION,
    crmContextHash: crmHash,
  });

  let gapAnalysis: ProductGapAnalysis | null = await getPersistedGapAnalysis(
    input.clinicId,
    gapCacheKey,
  );

  if (
    !gapAnalysis ||
    isGapAnalysisStale(gapAnalysis, profile.sourceVersion, input.catalogVersion, crmHash) ||
    input.forceRefresh ||
    sourceStale
  ) {
    gapAnalysis = analyzeProductGaps({
      profile,
      catalog: input.catalog,
      catalogVersion: input.catalogVersion,
      provinceCode: input.provinceCode,
      credentials,
      crm,
    });
    await persistGapAnalysis(gapAnalysis, cfg.cacheTtlSeconds);
  }

  const oppCacheKey = opportunityAnalysisCacheKey({
    gapAnalysisVersion: gapAnalysisVersionHash(gapAnalysis),
    catalogVersion: input.catalogVersion,
    scoringRulesVersion: PRODUCT_OPPORTUNITY_SCORING_VERSION,
    crmContextHash: crmHash,
  });

  let opportunityAnalysis: ProductOpportunityAnalysis | null =
    await getPersistedOpportunityAnalysis(input.clinicId, oppCacheKey);

  const gapVersionForOpp = gapAnalysisVersionHash(gapAnalysis);

  if (
    !opportunityAnalysis ||
    isOpportunityAnalysisStale(
      opportunityAnalysis,
      gapVersionForOpp,
      input.catalogVersion,
      crmHash,
    ) ||
    input.forceRefresh ||
    sourceStale
  ) {
    opportunityAnalysis = scoreProductOpportunities({
      gapAnalysis,
      catalog: input.catalog,
      catalogVersion: input.catalogVersion,
      provinceCode: input.provinceCode,
      credentials,
      crm,
      crmExtensions: input.crmExtensions,
      accountFitScore: input.accountFitScore ?? null,
    });
    await persistOpportunityAnalysis(opportunityAnalysis, cfg.cacheTtlSeconds);
  }

  const dto = buildClinicIntelligenceDto({
    profile,
    gapAnalysis,
    opportunityAnalysis,
    catalog: input.catalog,
    role: "REP",
    accountFitScore: input.accountFitScore ?? null,
    researchState: researchUiState(profile, sourceStale),
    canRefresh: true,
  });

  return { ok: true, dto, profile, gapAnalysis, opportunityAnalysis };
}

export async function getCachedClinicIntelligence(
  input: ClinicIntelligenceInput & { role: import("@/domain/auth/permissions").AppRoleName },
): Promise<ClinicIntelligenceDto> {
  const crm = input.crm ?? DEFAULT_GAP_CRM_CONTEXT;
  const crmHash = hashGapCrmContext(crm);

  const researchContext = buildResearchContext({
    clinicId: input.clinicId,
    businessName: input.businessName,
    provinceCode: input.provinceCode,
    segmentNumber: input.segmentNumber,
    categoryLabel: input.categoryLabel,
    websiteUrl: input.websiteUrl,
    enrichment: input.enrichment ?? null,
    rawPages: input.rawPages ?? [],
  });
  const sourceVersion = computeSourceVersion(researchContext.pages, researchContext.promptVersion);

  let profile = await getPersistedResearchProfile(
    input.clinicId,
    sourceVersion,
    researchContext.promptVersion,
  );
  let stale = false;
  if (!profile) {
    const anyProfile = await getResearchProfileByClinicId(input.clinicId);
    if (anyProfile) {
      stale = isResearchProfileStale(anyProfile, sourceVersion, researchContext.promptVersion);
      profile = stale ? anyProfile : anyProfile;
    }
  }

  if (!profile) {
    return emptyClinicIntelligenceDto(input.clinicId, input.accountFitScore ?? null);
  }

  const gapCacheKey = gapAnalysisCacheKey({
    profileVersion: profile.sourceVersion,
    catalogVersion: input.catalogVersion,
    gapRulesVersion: PRODUCT_GAP_RULES_VERSION,
    crmContextHash: crmHash,
  });

  const gapAnalysis = await getPersistedGapAnalysis(input.clinicId, gapCacheKey);
  const oppCacheKey = gapAnalysis
    ? opportunityAnalysisCacheKey({
        gapAnalysisVersion: gapAnalysisVersionHash(gapAnalysis),
        catalogVersion: input.catalogVersion,
        scoringRulesVersion: PRODUCT_OPPORTUNITY_SCORING_VERSION,
        crmContextHash: crmHash,
      })
    : "";

  const opportunityAnalysis = oppCacheKey
    ? await getPersistedOpportunityAnalysis(input.clinicId, oppCacheKey)
    : null;

  if (!gapAnalysis || !opportunityAnalysis) {
    return buildClinicIntelligenceDto({
      profile,
      gapAnalysis: null,
      opportunityAnalysis: null,
      catalog: input.catalog,
      role: input.role,
      accountFitScore: input.accountFitScore ?? null,
      researchState: stale ? "STALE" : researchUiState(profile, false),
      canRefresh: true,
    });
  }

  return buildClinicIntelligenceDto({
    profile,
    gapAnalysis,
    opportunityAnalysis,
    catalog: input.catalog,
    role: input.role,
    accountFitScore: input.accountFitScore ?? null,
    researchState: stale ? "STALE" : researchUiState(profile, false),
    canRefresh: true,
  });
}
