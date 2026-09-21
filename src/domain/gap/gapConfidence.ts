/**
 * Deterministic gap confidence — not opportunity score.
 */

import type { InventoryState } from "@/domain/research/clinicCapabilityProfile";
import type { GapConfidence } from "./productGapAnalysis";

export function gapConfidenceFor(params: {
  targetState: InventoryState;
  adjacentStrength: "strong" | "moderate" | "weak";
  scopeEligible: boolean;
  practitionerConfirmed: boolean;
  sparseCoverage: boolean;
}): GapConfidence {
  if (params.sparseCoverage) return "LOW";

  if (
    params.targetState === "CONFIRMED_ABSENT" &&
    params.adjacentStrength === "strong" &&
    params.scopeEligible &&
    params.practitionerConfirmed
  ) {
    return "HIGH";
  }

  if (
    params.targetState === "NOT_FOUND" &&
    params.adjacentStrength === "strong" &&
    params.scopeEligible &&
    params.practitionerConfirmed
  ) {
    return "MEDIUM";
  }

  if (params.targetState === "AMBIGUOUS" || params.adjacentStrength === "weak") {
    return "LOW";
  }

  if (params.targetState === "UNKNOWN") return "LOW";

  return "MEDIUM";
}

export function adjacentStrength(
  adjacentTags: number,
  keywordHits: number,
): "strong" | "moderate" | "weak" {
  if (adjacentTags >= 1 && keywordHits >= 1) return "strong";
  if (adjacentTags >= 1 || keywordHits >= 2) return "strong";
  if (keywordHits >= 1) return "moderate";
  return "weak";
}
