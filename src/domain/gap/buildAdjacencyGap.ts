/**
 * Build a single adjacency-driven gap candidate.
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
import { verificationQuestionFor } from "./verificationQuestions";
import {
  countKeywordHits,
  gapId,
  practitionerConfirmed,
  resolveFamilyProductIds,
  scopeAllowsFamily,
  statesAllowGapTarget,
} from "./gapHelpers";

export function buildAdjacencyGap(
  rule: AdjacencyRule,
  inventory: ProfileInventory,
  input: GapAnalysisInput,
  gapType: "CAPABILITY_GAP" | "PRODUCT_LINE_GAP",
): ProductGap | null {
  const targetState = getCapabilityState(inventory, rule.targetCapability);
  if (targetState === "CONFIRMED_PRESENT" || targetState === "UNKNOWN") return null;
  if (!statesAllowGapTarget(targetState)) return null;

  const adjacentTags = hasAdjacentCapability(inventory, rule.adjacentCapabilityTags);
  const keywordHits = countKeywordHits(inventory, rule.adjacentKeywords);
  const adjStrength = adjacentStrength(adjacentTags.length, keywordHits);
  if (adjStrength === "weak" && adjacentTags.length === 0 && keywordHits === 0) return null;

  const presentCapabilities = [...new Set([...inventory.presentCapabilities, ...adjacentTags])];
  const scope = scopeAllowsFamily(rule.productFamily, input.provinceCode, input.credentials);
  const productResolution = resolveFamilyProductIds(
    input.catalog,
    rule.productFamily,
    rule.primaryProductId,
    input,
    false,
  );

  let eligibilityState: GapEligibilityState = productResolution.eligibility;
  const blockingReasons = [...productResolution.blockingReasons];
  if (input.crm.doNotContact) {
    eligibilityState = "BLOCKED_DNC";
    blockingReasons.push("Account is do-not-contact — gap is informational only.");
  }
  if (!scope.allowed && gapType === "CAPABILITY_GAP") return null;
  if (!scope.allowed && rule.productFamily === "FIDIA_HY_TISSUE_PRP") {
    eligibilityState = "BLOCKED_SCOPE";
    blockingReasons.push("Provincial scope does not allow Fidia PRP conversation.");
  }
  if (productResolution.productIds.length === 0) return null;

  const evidenceRefIds = collectAdjacencyEvidence(
    input.profile,
    inventory,
    rule.adjacentKeywords,
    [...rule.adjacentCapabilityTags, rule.targetCapability],
  );

  const confidence = gapConfidenceFor({
    targetState,
    adjacentStrength: adjStrength,
    scopeEligible: scope.allowed,
    practitionerConfirmed: practitionerConfirmed(inventory),
    sparseCoverage: inventory.unknownCoverage,
  });

  const verificationRequired = targetState === "NOT_FOUND" || targetState === "AMBIGUOUS";
  const reasonCode =
    targetState === "CONFIRMED_ABSENT"
      ? "ADJACENT_PRESENT_TARGET_ABSENT"
      : targetState === "NOT_FOUND"
        ? "ADJACENT_PRESENT_TARGET_NOT_FOUND"
        : "ADJACENT_PRESENT_TARGET_AMBIGUOUS";

  return {
    id: gapId([input.profile.clinicId, gapType, rule.id, rule.targetCapability]),
    gapType,
    capability: rule.targetCapability,
    relevantProductIds: productResolution.productIds,
    clinicInventoryState: targetState,
    evidenceRefIds,
    confidence,
    reasonCode,
    explanationData: {
      gapType,
      targetCapability: rule.targetCapability,
      adjacentCapabilities: adjacentTags,
      adjacentSignals: rule.adjacentKeywords.filter((k) =>
        hasAdjacentKeywordSignal(inventory, [k]),
      ),
      presentCapabilities,
      targetState,
      adjacencyRuleId: rule.id,
      productFamily: rule.productFamily,
      eligibilityConfirmed: scope.allowed && eligibilityState === "ELIGIBLE",
      crmTrigger: null,
    },
    verificationRequired,
    verificationQuestion: verificationRequired
      ? verificationQuestionFor(rule.targetCapability, gapType, targetState)
      : null,
    eligibilityState,
    blockingReasons,
  };
}
