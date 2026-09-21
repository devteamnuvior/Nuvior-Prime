/**
 * Rep-safe display labels for clinic intelligence (Stage F).
 */

import type { InventoryState } from "@/domain/research/clinicCapabilityProfile";
import type { PrimaryRecommendationStatus } from "@/domain/opportunity/productOpportunityAnalysis";
import type { ScoreBand } from "@/domain/opportunity/scoringConfig";
import { CAPABILITY_TAG_LABELS, type CapabilityTag } from "@/domain/products/capabilityTaxonomy";

export type InventoryStateLabel =
  | "Confirmed on website"
  | "Not found on reviewed pages"
  | "Needs verification"
  | "Unknown"
  | "Explicitly not listed on reviewed pages";

export function inventoryStateLabel(state: InventoryState): InventoryStateLabel {
  switch (state) {
    case "CONFIRMED_PRESENT":
      return "Confirmed on website";
    case "NOT_FOUND":
      return "Not found on reviewed pages";
    case "AMBIGUOUS":
      return "Needs verification";
    case "UNKNOWN":
      return "Unknown";
    case "CONFIRMED_ABSENT":
      return "Explicitly not listed on reviewed pages";
  }
}

export function capabilityLabel(tag: CapabilityTag | string | null): string {
  if (!tag) return "Capability";
  if (tag in CAPABILITY_TAG_LABELS) {
    return CAPABILITY_TAG_LABELS[tag as CapabilityTag];
  }
  return tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function strengthLabel(scoreBand: ScoreBand): string {
  if (scoreBand === "VERY_HIGH" || scoreBand === "HIGH") return "Strong opportunity";
  if (scoreBand === "MEDIUM") return "Moderate opportunity";
  return "Opportunity";
}

/** Rep-facing headline — never leads with raw numeric score. */
export function opportunityHeadline(
  status: PrimaryRecommendationStatus,
  scoreBand: ScoreBand,
): string {
  const strength = strengthLabel(scoreBand);
  switch (status) {
    case "CONFIRMED":
      return strength;
    case "PENDING_VERIFICATION":
      return `${strength} · Verify first`;
    case "NONE":
      return "No clear product opportunity yet";
    case "BLOCKED_DNC":
      return "";
  }
}

export function secondaryOpportunityHeadline(scoreBand: ScoreBand): string {
  if (scoreBand === "VERY_HIGH" || scoreBand === "HIGH") return "High opportunity";
  if (scoreBand === "MEDIUM") return "Moderate opportunity";
  return "Possible opportunity";
}
