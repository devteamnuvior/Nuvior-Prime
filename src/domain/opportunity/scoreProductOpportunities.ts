/**
 * Product opportunity scoring orchestrator — Stage E entry point.
 */

import { createHash } from "node:crypto";
import type { ProductGap } from "@/domain/gap/productGapAnalysis";
import type { NuviorProduct } from "@/domain/products/nuviorProduct";
import { aggregateGapsByProduct } from "./aggregateGaps";
import { applyHardGates, mergeGapEligibility } from "./hardGates";
import {
  gapAnalysisVersionHash,
  hashOpportunityCrmContext,
  type OpportunityScoringInput,
} from "./opportunityContext";
import type {
  BlockedProductOpportunity,
  ProductOpportunity,
  ProductOpportunityAnalysis,
} from "./productOpportunityAnalysis";
import {
  computeOpportunityConfidence,
  computeScoreComponents,
  scoreBandForTotal,
} from "./scoreCalculator";
import { selectPrimaryOpportunity } from "./selectPrimary";
import { PRODUCT_OPPORTUNITY_SCORING_VERSION } from "./scoringConfig";

function opportunityId(clinicId: string, productId: string): string {
  return createHash("sha256").update(`${clinicId}|${productId}`).digest("hex").slice(0, 16);
}

function buildExplanationData(product: NuviorProduct, gaps: ProductGap[]) {
  const states = gaps
    .map((g) => g.clinicInventoryState)
    .filter(Boolean) as string[];
  return {
    contributingGapTypes: [...new Set(gaps.map((g) => g.gapType))],
    strongestInventoryState: states[0] ?? null,
    productFamily: product.productFamily,
    trainingProduct: product.trainingRequired,
    crmTriggers: gaps.map((g) => g.explanationData.crmTrigger).filter(Boolean) as string[],
  };
}

function collectVerificationQuestions(gaps: ProductGap[]): string[] {
  const qs = new Set<string>();
  for (const g of gaps) {
    if (g.verificationQuestion) qs.add(g.verificationQuestion);
  }
  return [...qs];
}

function collectEvidenceIds(gaps: ProductGap[]): string[] {
  const ids = new Set<string>();
  for (const g of gaps) {
    for (const id of g.evidenceRefIds) ids.add(id);
  }
  return [...ids];
}

export function scoreProductOpportunities(
  input: OpportunityScoringInput,
): ProductOpportunityAnalysis {
  const { gapAnalysis, catalog, crm } = input;
  const analyzedAt = input.analyzedAt ?? new Date().toISOString();
  const evidenceById = new Map(gapAnalysis.evidenceRefs.map((e) => [e.id, e]));
  const catalogById = new Map(catalog.map((p) => [p.id, p]));
  const catalogPriority = new Map(catalog.map((p) => [p.id, p.commercialPriority]));

  const buckets = aggregateGapsByProduct(gapAnalysis.gaps);
  const opportunities: ProductOpportunity[] = [];
  const blockedOpportunities: BlockedProductOpportunity[] = [];

  for (const bucket of buckets) {
    const product = catalogById.get(bucket.productId);
    if (!product) {
      blockedOpportunities.push({
        productId: bucket.productId,
        productFamily: "APTOS",
        relatedGapIds: bucket.gapIds,
        eligibilityState: "BLOCKED_CATALOG",
        blockingReasons: ["Product not found in catalog snapshot."],
      });
      continue;
    }

    const gate = applyHardGates(product, bucket.gaps, {
      provinceCode: input.provinceCode,
      credentials: input.credentials,
      crm,
    });

    if (!gate.passed) {
      blockedOpportunities.push({
        productId: product.id,
        productFamily: product.productFamily,
        relatedGapIds: bucket.gapIds,
        eligibilityState: gate.eligibilityState,
        blockingReasons: gate.reasons,
      });
      continue;
    }

    const components = computeScoreComponents(
      product,
      bucket.gaps,
      crm,
      input.crmExtensions,
      evidenceById,
    );
    const confidence = computeOpportunityConfidence(bucket.gaps, components.evidencePoints);
    const eligibilityState = mergeGapEligibility(bucket.gaps, crm);
    const evidenceRefIds = collectEvidenceIds(bucket.gaps);
    const verificationQuestions = collectVerificationQuestions(bucket.gaps);
    const verificationRequired = bucket.gaps.some((g) => g.verificationRequired);

    opportunities.push({
      id: opportunityId(gapAnalysis.clinicId, product.id),
      productId: product.id,
      productFamily: product.productFamily,
      relatedGapIds: bucket.gapIds,
      opportunityScore: components.total,
      scoreBand: scoreBandForTotal(components.total),
      confidence,
      eligibilityState,
      blockingReasons: [],
      scoreComponents: components,
      evidenceRefIds,
      verificationRequired,
      verificationQuestions,
      explanationData: buildExplanationData(product, bucket.gaps),
      isPrimary: false,
    });
  }

  opportunities.sort((a, b) =>
    b.opportunityScore - a.opportunityScore || a.productId.localeCompare(b.productId),
  );

  const primaryResult = selectPrimaryOpportunity(opportunities, {
    doNotContact: crm.doNotContact,
    evidenceById,
    catalogPriority,
  });

  for (const opp of opportunities) {
    opp.isPrimary = opp.id === primaryResult.primaryOpportunityId;
  }

  const evidenceRefIds = new Set(opportunities.flatMap((o) => o.evidenceRefIds));
  const evidenceRefs = gapAnalysis.evidenceRefs.filter((e) => evidenceRefIds.has(e.id));

  const noRecommendationReasons = [
    ...primaryResult.noRecommendationReasons,
    ...(gapAnalysis.noClearGapReasons.length > 0 && opportunities.length === 0
      ? gapAnalysis.noClearGapReasons
      : []),
  ];

  return {
    clinicId: gapAnalysis.clinicId,
    analyzedAt,
    gapAnalysisVersion: gapAnalysisVersionHash(gapAnalysis),
    catalogVersion: input.catalogVersion,
    scoringRulesVersion: PRODUCT_OPPORTUNITY_SCORING_VERSION,
    crmContextHash: hashOpportunityCrmContext(crm, input.crmExtensions),
    opportunities,
    primaryOpportunityId: primaryResult.primaryOpportunityId,
    primaryProductId: primaryResult.primaryProductId,
    primaryRecommendationStatus: primaryResult.primaryRecommendationStatus,
    noRecommendationReasons,
    blockedOpportunities,
    evidenceRefs,
    accountFitScore: input.accountFitScore ?? null,
  };
}
