/**
 * Rep-safe clinic intelligence DTO (Stage F).
 * Normal reps never receive raw scores, provider internals, or chain-of-thought.
 */

import type { PrimaryRecommendationStatus } from "@/domain/opportunity/productOpportunityAnalysis";
import type { OpportunityScoreComponents } from "@/domain/opportunity/productOpportunityAnalysis";
import type { InventoryStateLabel } from "./labels";

export type ClinicResearchUiState =
  | "NOT_RESEARCHED"
  | "RESEARCHING"
  | "RESEARCHED"
  | "NEEDS_VERIFICATION"
  | "STALE"
  | "FAILED";

export type OfferingItem = {
  label: string;
  inventoryStateLabel: InventoryStateLabel;
  category: "service" | "brand" | "capability" | "device";
};

export type OpportunityGapItem = {
  capabilityLabel: string;
  inventoryStateLabel: InventoryStateLabel;
  whyItMatters: string;
};

export type EvidenceItem = {
  id: string;
  sourcePage: string | null;
  url: string | null;
  snippet: string;
  extractedItem: string | null;
  confidence: string;
  retrievedAt: string;
};

export type PrimaryOpportunityView = {
  productId: string;
  productName: string;
  headline: string;
  recommendationStatus: PrimaryRecommendationStatus;
  whyReasons: string[];
  verifyQuestion: string | null;
  gap: OpportunityGapItem | null;
  openingAngle: string | null;
};

export type SecondaryOpportunityView = {
  productId: string;
  productName: string;
  headline: string;
};

export type ClinicIntelligenceDiagnostics = {
  opportunityScore: number;
  scoreBand: string;
  scoreComponents: OpportunityScoreComponents;
  confidence: string;
  profileVersion: string;
  gapRulesVersion: string;
  scoringVersion: string;
  catalogVersion: string;
  researchProvider: string;
  researchModel: string | null;
};

export type ClinicIntelligenceDto = {
  clinicId: string;
  researchState: ClinicResearchUiState;
  researchedAt: string | null;
  /** Account Fit — separate from product opportunity. */
  accountFitScore: number | null;
  offerings: OfferingItem[];
  primary: PrimaryOpportunityView | null;
  secondaryOpportunities: SecondaryOpportunityView[];
  blockedDnc: boolean;
  noRecommendationMessage: string | null;
  failureMessage: string | null;
  evidence: EvidenceItem[];
  diagnostics: ClinicIntelligenceDiagnostics | null;
  canRefresh: boolean;
};

export type BriefIntelligenceSections = {
  lockedFromOpportunityEngine: boolean;
  clinicSnapshot: string[];
  accountFitLine: string | null;
  whatTheyAppearToOffer: string[];
  bestOpportunity: {
    productName: string;
    headline: string;
    status: PrimaryRecommendationStatus;
  } | null;
  whyReasons: string[];
  gapSummary: string | null;
  verifyQuestion: string | null;
  openingAngle: string | null;
  watchOuts: string[];
};
