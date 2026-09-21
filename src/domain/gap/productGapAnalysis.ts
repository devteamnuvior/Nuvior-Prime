/**
 * Product gap analysis — deterministic output (Stage D).
 * Candidate gaps only — no primary recommendation or opportunity score.
 */

import type { CapabilityTag } from "@/domain/products/capabilityTaxonomy";
import type { InventoryState, ProfileEvidenceRef } from "@/domain/research/clinicCapabilityProfile";

export const PRODUCT_GAP_RULES_VERSION = "1.0.0" as const;

export const GAP_TYPES = [
  "CAPABILITY_GAP",
  "PRODUCT_LINE_GAP",
  "TRAINING_GAP",
  "CROSS_SELL_OPPORTUNITY",
  "RETENTION_GAP",
  "UPGRADE_OPPORTUNITY",
  "NO_CLEAR_GAP",
] as const;

export type GapType = (typeof GAP_TYPES)[number];

export const GAP_CONFIDENCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;

export type GapConfidence = (typeof GAP_CONFIDENCE_LEVELS)[number];

export type GapEligibilityState = "ELIGIBLE" | "BLOCKED_SCOPE" | "BLOCKED_CATALOG" | "BLOCKED_DNC";

export type GapExplanationData = {
  gapType: GapType;
  targetCapability: CapabilityTag | null;
  adjacentCapabilities: CapabilityTag[];
  adjacentSignals: string[];
  presentCapabilities: CapabilityTag[];
  targetState: InventoryState | null;
  adjacencyRuleId: string | null;
  productFamily: string | null;
  eligibilityConfirmed: boolean;
  crmTrigger: string | null;
};

export type ProductGap = {
  id: string;
  gapType: GapType;
  capability: CapabilityTag | null;
  relevantProductIds: string[];
  clinicInventoryState: InventoryState | null;
  evidenceRefIds: string[];
  confidence: GapConfidence;
  reasonCode: string;
  explanationData: GapExplanationData;
  verificationRequired: boolean;
  verificationQuestion: string | null;
  eligibilityState: GapEligibilityState;
  blockingReasons: string[];
};

export type GapVerificationItem = {
  gapId: string;
  question: string;
  reason: string;
};

export type ProductGapAnalysis = {
  clinicId: string;
  analyzedAt: string;
  profileVersion: string;
  catalogVersion: string;
  gapRulesVersion: typeof PRODUCT_GAP_RULES_VERSION;
  crmContextHash: string | null;
  gaps: ProductGap[];
  noClearGapReasons: string[];
  verificationItems: GapVerificationItem[];
  evidenceRefs: ProfileEvidenceRef[];
  /** Stage D must not emit ranked products or primary recommendation. */
  hasPrimaryRecommendation: false;
  hasOpportunityScore: false;
};
