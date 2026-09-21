/**
 * Input context for Stage E opportunity scoring.
 */

import type { GapCrmContext } from "@/domain/gap/gapContext";
import type { ProductGapAnalysis } from "@/domain/gap/productGapAnalysis";
import type { NuviorProduct } from "@/domain/products/nuviorProduct";
import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";
import { createHash } from "node:crypto";
import { gapAnalysisCacheKey } from "@/domain/gap/gapContext";
import { PRODUCT_OPPORTUNITY_SCORING_VERSION } from "./scoringConfig";

export type OpportunityCrmExtensions = {
  /** Authoritative CRM: revisit is due. Scoring-only — not used in Stage D. */
  revisitDue?: boolean;
  /** Authoritative CRM: account dormant. Scoring-only. */
  dormantCustomer?: boolean;
};

export type OpportunityScoringInput = {
  gapAnalysis: ProductGapAnalysis;
  catalog: NuviorProduct[];
  catalogVersion: string;
  provinceCode: string;
  credentials: AccountCredentialSignals;
  crm: GapCrmContext;
  crmExtensions?: OpportunityCrmExtensions;
  /** Passthrough for calibration — does not affect scoring. */
  accountFitScore?: number | null;
  analyzedAt?: string;
};

export function gapAnalysisVersionHash(gapAnalysis: ProductGapAnalysis): string {
  return gapAnalysisCacheKey({
    profileVersion: gapAnalysis.profileVersion,
    catalogVersion: gapAnalysis.catalogVersion,
    gapRulesVersion: gapAnalysis.gapRulesVersion,
    crmContextHash: gapAnalysis.crmContextHash ?? "none",
  });
}

export function opportunityAnalysisCacheKey(input: {
  gapAnalysisVersion: string;
  catalogVersion: string;
  scoringRulesVersion: string;
  crmContextHash: string;
}): string {
  return [
    input.gapAnalysisVersion,
    input.catalogVersion,
    input.scoringRulesVersion,
    input.crmContextHash,
  ].join("|");
}

export function hashOpportunityCrmContext(
  crm: GapCrmContext,
  extensions?: OpportunityCrmExtensions,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        dnc: crm.doNotContact,
        formerMeso: crm.formerMesoesteticCustomer,
        academy: crm.hasAcademyAccount,
        aptosCert: crm.aptosCertificationLevel ?? "",
        existing: crm.existingNuviorCustomer,
        families: [...crm.activeNuviorFamilies].sort(),
        revisit: extensions?.revisitDue ?? false,
        dormant: extensions?.dormantCustomer ?? false,
        scoring: PRODUCT_OPPORTUNITY_SCORING_VERSION,
      }),
    )
    .digest("hex")
    .slice(0, 16);
}
