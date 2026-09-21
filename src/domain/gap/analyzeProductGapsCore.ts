/**
 * Product gap engine orchestrator — Stage D entry point.
 */

import { CATALOG_PRODUCT_IDS } from "@/domain/products/leadProductCompat";
import type { GapAnalysisInput } from "./gapContext";
import { hashGapCrmContext } from "./gapContext";
import {
  evaluateCapabilityGaps,
  evaluateCrossSellGaps,
  evaluateProductLineGaps,
  evaluateRetentionGap,
  evaluateTrainingGap,
} from "./gapEvaluators";
import { collectNoClearGapReasons, dedupeGaps } from "./gapHelpers";
import { buildProfileInventory } from "./profileInventory";
import type { GapVerificationItem, ProductGapAnalysis } from "./productGapAnalysis";
import { PRODUCT_GAP_RULES_VERSION } from "./productGapAnalysis";

/** Approved comparison KB — empty until approved; UPGRADE_OPPORTUNITY blocked. */
export const APPROVED_PRODUCT_COMPARISONS: ReadonlySet<string> = new Set();

export function analyzeProductGaps(input: GapAnalysisInput): ProductGapAnalysis {
  const inventory = buildProfileInventory(input.profile);
  const analyzedAt = input.analyzedAt ?? new Date().toISOString();

  const retention = evaluateRetentionGap(input);
  const training = evaluateTrainingGap(inventory, input);
  const baseGaps = [
    ...evaluateCapabilityGaps(inventory, input),
    ...evaluateProductLineGaps(inventory, input),
    ...(retention ? [retention] : []),
    ...(training ? [training] : []),
  ];
  let gaps = dedupeGaps(baseGaps);

  gaps = dedupeGaps([...gaps, ...evaluateCrossSellGaps(gaps, input)]);

  gaps = gaps.filter((g) => {
    if (g.gapType === "UPGRADE_OPPORTUNITY") {
      const comparisonKey = `${g.capability}:${g.relevantProductIds.join(",")}`;
      return APPROVED_PRODUCT_COMPARISONS.has(comparisonKey);
    }
    return !g.relevantProductIds.some((id) => id === CATALOG_PRODUCT_IDS.MESOESTETIC_HISTORICAL);
  });

  const noClearGapReasons = collectNoClearGapReasons(inventory, gaps.length);

  const verificationItems: GapVerificationItem[] = gaps
    .filter((g) => g.verificationRequired && g.verificationQuestion)
    .map((g) => ({
      gapId: g.id,
      question: g.verificationQuestion!,
      reason:
        g.clinicInventoryState === "NOT_FOUND"
          ? "Not found in reviewed sources — requires rep verification."
          : "Ambiguous evidence — requires rep verification.",
    }));

  const evidenceRefIds = new Set(gaps.flatMap((g) => g.evidenceRefIds));
  const evidenceRefs = input.profile.evidenceRefs.filter((e) => evidenceRefIds.has(e.id));

  return {
    clinicId: input.profile.clinicId,
    analyzedAt,
    profileVersion: input.profile.sourceVersion,
    catalogVersion: input.catalogVersion,
    gapRulesVersion: PRODUCT_GAP_RULES_VERSION,
    crmContextHash: hashGapCrmContext(input.crm),
    gaps,
    noClearGapReasons,
    verificationItems,
    evidenceRefs,
    hasPrimaryRecommendation: false,
    hasOpportunityScore: false,
  };
}
