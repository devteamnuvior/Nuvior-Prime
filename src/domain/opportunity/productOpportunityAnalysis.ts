/**
 * Product opportunity analysis — deterministic ranked output (Stage E).
 */

import type { ProductFamilyCode } from "@/domain/products/nuviorProduct";
import type { ProfileEvidenceRef } from "@/domain/research/clinicCapabilityProfile";
import type { GapEligibilityState } from "@/domain/gap/productGapAnalysis";
import type { OpportunityConfidence, ScoreBand } from "./scoringConfig";
import type { PRODUCT_OPPORTUNITY_SCORING_VERSION } from "./scoringConfig";

export type OpportunityScoreComponents = {
  gapStrengthPoints: number;
  adjacencyPoints: number;
  evidencePoints: number;
  gapTypeBonusPoints: number;
  crmModifier: number;
  commercialPriorityModifier: number;
  trainingModifier: number;
  prerequisiteModifier: number;
  uncertaintyPenalty: number;
  total: number;
};

export type OpportunityExplanationData = {
  contributingGapTypes: string[];
  strongestInventoryState: string | null;
  productFamily: ProductFamilyCode;
  trainingProduct: boolean;
  crmTriggers: string[];
};

export type ProductOpportunity = {
  id: string;
  productId: string;
  productFamily: ProductFamilyCode;
  relatedGapIds: string[];
  opportunityScore: number;
  scoreBand: ScoreBand;
  confidence: OpportunityConfidence;
  eligibilityState: GapEligibilityState | "BLOCKED_THRESHOLD";
  blockingReasons: string[];
  scoreComponents: OpportunityScoreComponents;
  evidenceRefIds: string[];
  verificationRequired: boolean;
  verificationQuestions: string[];
  explanationData: OpportunityExplanationData;
  isPrimary: boolean;
};

export type BlockedProductOpportunity = {
  productId: string;
  productFamily: ProductFamilyCode;
  relatedGapIds: string[];
  eligibilityState: GapEligibilityState;
  blockingReasons: string[];
};

export type PrimaryRecommendationStatus =
  | "NONE"
  | "CONFIRMED"
  | "PENDING_VERIFICATION"
  | "BLOCKED_DNC";

export type ProductOpportunityAnalysis = {
  clinicId: string;
  analyzedAt: string;
  gapAnalysisVersion: string;
  catalogVersion: string;
  scoringRulesVersion: typeof PRODUCT_OPPORTUNITY_SCORING_VERSION;
  crmContextHash: string | null;
  opportunities: ProductOpportunity[];
  primaryOpportunityId: string | null;
  primaryProductId: string | null;
  primaryRecommendationStatus: PrimaryRecommendationStatus;
  noRecommendationReasons: string[];
  blockedOpportunities: BlockedProductOpportunity[];
  evidenceRefs: ProfileEvidenceRef[];
  /** Account Fit remains separate — optional passthrough for calibration display only. */
  accountFitScore: number | null;
};
