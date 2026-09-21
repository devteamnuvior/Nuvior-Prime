export { analyzeProductGaps, APPROVED_PRODUCT_COMPARISONS } from "./analyzeProductGapsCore";
export { PRODUCT_GAP_RULES_VERSION, GAP_TYPES, GAP_CONFIDENCE_LEVELS } from "./productGapAnalysis";
export type {
  ProductGapAnalysis,
  ProductGap,
  GapType,
  GapConfidence,
  GapEligibilityState,
  GapExplanationData,
  GapVerificationItem,
} from "./productGapAnalysis";
export { ADJACENCY_RULES, RETENTION_FAMILY, TRAINING_GAP_RULE } from "./adjacencyRules";
export type { GapAnalysisInput, GapCrmContext } from "./gapContext";
export {
  credentialsFromProfile,
  hashGapCrmContext,
  gapAnalysisCacheKey,
  DEFAULT_GAP_CRM_CONTEXT,
} from "./gapContext";
