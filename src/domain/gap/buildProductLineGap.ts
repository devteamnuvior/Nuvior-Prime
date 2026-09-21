/**
 * Product-line gap when category participation exists but NUVIOR line is not mapped.
 */

import { adjacentStrength, gapConfidenceFor } from "./gapConfidence";
import type { GapAnalysisInput } from "./gapContext";
import type { AdjacencyRule } from "./adjacencyRules";
import {
  collectAdjacencyEvidence,
  getCapabilityState,
  hasAdjacentCapability,
  hasAdjacentKeywordSignal,
  type ProfileInventory,
} from "./profileInventory";
import type { GapEligibilityState, ProductGap } from "./productGapAnalysis";
import {
  countKeywordHits,
  gapId,
  hasCompetitorSkincareLine,
  hasNuviorFamilySignal,
  practitionerConfirmed,
  resolveFamilyProductIds,
  scopeAllowsFamily,
} from "./gapHelpers";

export function buildProductLineGap(
  rule: AdjacencyRule,
  inventory: ProfileInventory,
  input: GapAnalysisInput,
): ProductGap | null {
  const targetState = getCapabilityState(inventory, rule.targetCapability);

  const categoryParticipation =
    targetState === "CONFIRMED_PRESENT" ||
    inventory.presentCapabilities.some(
      (c) => rule.adjacentCapabilityTags.includes(c) || c === rule.targetCapability,
    );

  if (!categoryParticipation) return null;
  if (hasNuviorFamilySignal(inventory, rule.productFamily)) return null;

  if (rule.productFamily === "DERMACEUTIC" && !hasCompetitorSkincareLine(inventory)) return null;

  if (rule.productFamily === "FIDIA_HY_TISSUE_PRP") {
    const prpHair = getCapabilityState(inventory, "PRP_HAIR");
    const prpRegen = getCapabilityState(inventory, "PRP_REGENERATIVE");
    const prpParticipation =
      prpHair === "CONFIRMED_PRESENT" ||
      prpRegen === "CONFIRMED_PRESENT" ||
      inventory.presentCapabilities.includes("PRP_HAIR") ||
      inventory.presentCapabilities.includes("PRP_REGENERATIVE");
    if (!prpParticipation) return null;
  }

  const adjacentTags = hasAdjacentCapability(inventory, rule.adjacentCapabilityTags);
  const keywordHits = countKeywordHits(inventory, rule.adjacentKeywords);
  const adjStrength = adjacentStrength(adjacentTags.length, keywordHits);

  const scope = scopeAllowsFamily(rule.productFamily, input.provinceCode, input.credentials);
  const productResolution = resolveFamilyProductIds(
    input.catalog,
    rule.productFamily,
    rule.primaryProductId,
    input,
    false,
  );
  if (productResolution.productIds.length === 0) return null;

  let eligibilityState: GapEligibilityState = productResolution.eligibility;
  const blockingReasons = [...productResolution.blockingReasons];
  if (input.crm.doNotContact) {
    eligibilityState = "BLOCKED_DNC";
    blockingReasons.push("Account is do-not-contact — gap is informational only.");
  }
  if (!scope.allowed && rule.productFamily === "FIDIA_HY_TISSUE_PRP") {
    eligibilityState = "BLOCKED_SCOPE";
    blockingReasons.push("Provincial scope does not allow Fidia PRP conversation.");
  }

  const presentCapabilities = [...new Set([...inventory.presentCapabilities, ...adjacentTags])];
  const evidenceRefIds = collectAdjacencyEvidence(
    input.profile,
    inventory,
    rule.adjacentKeywords,
    [...rule.adjacentCapabilityTags, rule.targetCapability],
  );

  const confidence = gapConfidenceFor({
    targetState: targetState === "UNKNOWN" ? "NOT_FOUND" : targetState,
    adjacentStrength: adjStrength,
    scopeEligible: scope.allowed,
    practitionerConfirmed: practitionerConfirmed(inventory),
    sparseCoverage: inventory.unknownCoverage,
  });

  return {
    id: gapId([input.profile.clinicId, "PRODUCT_LINE_GAP", rule.id, rule.targetCapability]),
    gapType: "PRODUCT_LINE_GAP",
    capability: rule.targetCapability,
    relevantProductIds: productResolution.productIds,
    clinicInventoryState: targetState === "UNKNOWN" ? null : targetState,
    evidenceRefIds,
    confidence,
    reasonCode: "CATEGORY_PARTICIPATION_NO_NUVIOR_LINE",
    explanationData: {
      gapType: "PRODUCT_LINE_GAP",
      targetCapability: rule.targetCapability,
      adjacentCapabilities: adjacentTags,
      adjacentSignals: rule.adjacentKeywords.filter((k) =>
        hasAdjacentKeywordSignal(inventory, [k]),
      ),
      presentCapabilities,
      targetState: targetState === "UNKNOWN" ? null : targetState,
      adjacencyRuleId: rule.id,
      productFamily: rule.productFamily,
      eligibilityConfirmed: scope.allowed && eligibilityState === "ELIGIBLE",
      crmTrigger: null,
    },
    verificationRequired: false,
    verificationQuestion: null,
    eligibilityState,
    blockingReasons,
  };
}
