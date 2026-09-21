export { scoreProductOpportunities } from "./scoreProductOpportunities";
export {
  PRODUCT_OPPORTUNITY_SCORING_VERSION,
  SCORE_BAND_THRESHOLDS,
  PRIMARY_RECOMMENDATION_MIN_SCORE,
  PRIMARY_PENDING_VERIFICATION_MIN_SCORE,
} from "./scoringConfig";
export type { ScoreBand, OpportunityConfidence } from "./scoringConfig";
export type {
  ProductOpportunityAnalysis,
  ProductOpportunity,
  OpportunityScoreComponents,
  PrimaryRecommendationStatus,
  BlockedProductOpportunity,
} from "./productOpportunityAnalysis";
export type { OpportunityScoringInput, OpportunityCrmExtensions } from "./opportunityContext";
export {
  gapAnalysisVersionHash,
  opportunityAnalysisCacheKey,
  hashOpportunityCrmContext,
} from "./opportunityContext";
export { aggregateGapsByProduct } from "./aggregateGaps";
export { computeScoreComponents, scoreBandForTotal } from "./scoreCalculator";
export { applyHardGates, isCertificationLevelAppropriate } from "./hardGates";
export { selectPrimaryOpportunity, compareOpportunities } from "./selectPrimary";
