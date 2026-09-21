/**
 * Deterministic score component calculation.
 */

import type { ProductGap, GapConfidence } from "@/domain/gap/productGapAnalysis";
import type { GapCrmContext } from "@/domain/gap/gapContext";
import type { NuviorProduct } from "@/domain/products/nuviorProduct";
import type { ProfileEvidenceRef } from "@/domain/research/clinicCapabilityProfile";
import type { InventoryState } from "@/domain/research/clinicCapabilityProfile";
import {
  ADJACENCY_POINTS_MAX,
  COMMERCIAL_PRIORITY_MAX,
  CRM_MODIFIERS,
  EVIDENCE_POINTS_MAX,
  GAP_CONFIDENCE_POINTS,
  GAP_STRENGTH_POINTS,
  GAP_TYPE_BONUS,
  GAP_TYPE_BONUS_CAP,
  SCORE_BAND_THRESHOLDS,
  TRAINING_PREREQUISITE_BONUS,
  TRAINING_PREREQUISITE_DOMINANCE_BONUS,
  DIRECT_PRODUCT_WHEN_TRAINING_REQUIRED_PENALTY,
  UNCERTAINTY_PENALTIES,
  UNCERTAINTY_PENALTY_CAP,
  type OpportunityConfidence,
  type ScoreBand,
} from "./scoringConfig";
import type { OpportunityCrmExtensions } from "./opportunityContext";
import type { OpportunityScoreComponents } from "./productOpportunityAnalysis";

function inventoryStrengthPoints(state: InventoryState | null): number {
  if (!state) return GAP_STRENGTH_POINTS.CRM_ONLY ?? 12;
  return GAP_STRENGTH_POINTS[state] ?? 0;
}

function gapConfidencePoints(conf: GapConfidence): number {
  return GAP_CONFIDENCE_POINTS[conf];
}

function gapTypeBonusSum(gaps: ProductGap[]): number {
  let sum = 0;
  const seenTypes = new Set<string>();
  for (const g of gaps) {
    if (seenTypes.has(g.gapType)) continue;
    seenTypes.add(g.gapType);
    sum += GAP_TYPE_BONUS[g.gapType as keyof typeof GAP_TYPE_BONUS] ?? 0;
  }
  return Math.min(sum, GAP_TYPE_BONUS_CAP);
}

function adjacencyPointsFromGaps(gaps: ProductGap[]): number {
  let best = 0;
  for (const g of gaps) {
    const signalCount =
      g.explanationData.adjacentCapabilities.length +
      g.explanationData.adjacentSignals.length +
      g.explanationData.presentCapabilities.length;
    const pts = Math.min(
      ADJACENCY_POINTS_MAX,
      signalCount * 3 + gapConfidencePoints(g.confidence) * 0.4,
    );
    best = Math.max(best, Math.round(pts));
  }
  return best;
}

function evidencePointsFromGaps(
  gaps: ProductGap[],
  evidenceById: Map<string, ProfileEvidenceRef>,
): number {
  const ids = new Set<string>();
  for (const g of gaps) {
    for (const id of g.evidenceRefIds) ids.add(id);
  }
  if (ids.size === 0) return 0;

  let high = 0;
  let medium = 0;
  for (const id of ids) {
    const ref = evidenceById.get(id);
    if (!ref) continue;
    if (ref.confidence === "HIGH") high += 1;
    else if (ref.confidence === "MEDIUM") medium += 1;
  }
  const raw = high * 4 + medium * 2 + ids.size;
  return Math.min(EVIDENCE_POINTS_MAX, raw);
}

function crmModifierForProduct(
  product: NuviorProduct,
  crm: GapCrmContext,
  extensions: OpportunityCrmExtensions | undefined,
): number {
  let mod = 0;

  if (crm.formerMesoesteticCustomer && product.productFamily === "DERMACEUTIC") {
    mod += CRM_MODIFIERS.formerMesoesteticDermaceutic;
  }

  if (crm.existingNuviorCustomer) {
    if (crm.activeNuviorFamilies.includes(product.productFamily)) {
      mod += CRM_MODIFIERS.existingNuviorCustomerSameFamily;
    } else {
      mod += CRM_MODIFIERS.existingNuviorCustomerOther;
    }
  }

  if (extensions?.revisitDue) mod += CRM_MODIFIERS.revisitDue;
  if (extensions?.dormantCustomer) mod += CRM_MODIFIERS.dormantCustomer;

  if (product.trainingRequired && crm.hasAcademyAccount) {
    mod += CRM_MODIFIERS.hasAcademyAccountTraining;
  }

  return mod;
}

function commercialPriorityModifier(product: NuviorProduct): number {
  if (product.commercialPriority == null) return 0;
  return Math.round((product.commercialPriority / 100) * COMMERCIAL_PRIORITY_MAX);
}

function trainingModifier(gaps: ProductGap[], product: NuviorProduct): number {
  const hasTrainingGap = gaps.some((g) => g.gapType === "TRAINING_GAP");
  if (hasTrainingGap && product.trainingRequired) return TRAINING_PREREQUISITE_BONUS;
  return 0;
}

function prerequisiteModifier(gaps: ProductGap[], product: NuviorProduct): number {
  const hasTrainingGap = gaps.some((g) => g.gapType === "TRAINING_GAP");
  if (!hasTrainingGap) return 0;

  const family = product.productFamily;
  const sameFamilyCapabilityGap = gaps.some(
    (g) =>
      g.gapType === "CAPABILITY_GAP" &&
      g.explanationData.productFamily === family,
  );

  if (product.trainingRequired && sameFamilyCapabilityGap) {
    return TRAINING_PREREQUISITE_DOMINANCE_BONUS;
  }

  if (product.trainingRequired && hasTrainingGap) {
    return TRAINING_PREREQUISITE_DOMINANCE_BONUS;
  }

  if (!product.trainingRequired && sameFamilyCapabilityGap && hasTrainingGap) {
    return -DIRECT_PRODUCT_WHEN_TRAINING_REQUIRED_PENALTY;
  }

  return 0;
}

function uncertaintyPenalty(gaps: ProductGap[]): number {
  let penalty = 0;
  for (const g of gaps) {
    if (g.verificationRequired) penalty += UNCERTAINTY_PENALTIES.verificationRequired;
    if (g.clinicInventoryState === "NOT_FOUND") penalty += UNCERTAINTY_PENALTIES.notFoundCritical;
    if (g.clinicInventoryState === "AMBIGUOUS") penalty += UNCERTAINTY_PENALTIES.ambiguousCritical;
  }
  return Math.min(penalty, UNCERTAINTY_PENALTY_CAP);
}

export function computeOpportunityConfidence(
  gaps: ProductGap[],
  evidencePoints: number,
): OpportunityConfidence {
  if (gaps.some((g) => g.gapType === "RETENTION_GAP")) {
    return "MEDIUM";
  }

  const hasVerification = gaps.some((g) => g.verificationRequired);
  const hasNotFound = gaps.some((g) => g.clinicInventoryState === "NOT_FOUND");
  const gapConfs = gaps.map((g) => g.confidence);
  const allHigh = gapConfs.length > 0 && gapConfs.every((c) => c === "HIGH");
  const anyLow = gapConfs.some((c) => c === "LOW");

  if (allHigh && !hasVerification && evidencePoints >= 8) return "HIGH";
  if (hasVerification || hasNotFound || anyLow) return "MEDIUM";
  if (evidencePoints >= 4) return "MEDIUM";
  return "LOW";
}

export function computeScoreComponents(
  product: NuviorProduct,
  gaps: ProductGap[],
  crm: GapCrmContext,
  extensions: OpportunityCrmExtensions | undefined,
  evidenceById: Map<string, ProfileEvidenceRef>,
): OpportunityScoreComponents {
  const gapStrengthPoints = Math.max(
    ...gaps.map((g) => inventoryStrengthPoints(g.clinicInventoryState)),
    0,
  );
  const adjacencyPoints = adjacencyPointsFromGaps(gaps);
  const evidencePoints = evidencePointsFromGaps(gaps, evidenceById);
  const gapTypeBonusPoints = gapTypeBonusSum(gaps);
  const crmMod = crmModifierForProduct(product, crm, extensions);
  const commercialMod = commercialPriorityModifier(product);
  const trainingMod = trainingModifier(gaps, product);
  const prerequisiteMod = prerequisiteModifier(gaps, product);
  const uncertaintyPenaltyValue = uncertaintyPenalty(gaps);

  const total = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        gapStrengthPoints +
          adjacencyPoints +
          evidencePoints +
          gapTypeBonusPoints +
          crmMod +
          commercialMod +
          trainingMod +
          prerequisiteMod -
          uncertaintyPenaltyValue,
      ),
    ),
  );

  return {
    gapStrengthPoints,
    adjacencyPoints,
    evidencePoints,
    gapTypeBonusPoints,
    crmModifier: crmMod,
    commercialPriorityModifier: commercialMod,
    trainingModifier: trainingMod,
    prerequisiteModifier: prerequisiteMod,
    uncertaintyPenalty: uncertaintyPenaltyValue,
    total,
  };
}

export function scoreBandForTotal(total: number): ScoreBand {
  for (const t of SCORE_BAND_THRESHOLDS) {
    if (total >= t.min) return t.band;
  }
  return "VERY_LOW";
}
