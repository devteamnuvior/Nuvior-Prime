/**
 * Deterministic product opportunity scoring configuration — v1.0.0.
 * All weights and thresholds live here; do not scatter magic numbers.
 * @see docs/PRODUCT_OPPORTUNITY_SCORING.md
 */

export const PRODUCT_OPPORTUNITY_SCORING_VERSION = "1.0.0" as const;

/** Inventory-state contribution to gap strength (max taken across contributing gaps). */
export const GAP_STRENGTH_POINTS: Record<string, number> = {
  CONFIRMED_ABSENT: 28,
  NOT_FOUND: 18,
  AMBIGUOUS: 8,
  UNKNOWN: 0,
  CRM_ONLY: 20,
};

/** Gap confidence → adjacency alignment points (best gap wins). */
export const GAP_CONFIDENCE_POINTS = {
  HIGH: 22,
  MEDIUM: 14,
  LOW: 6,
} as const;

/** Per-gap-type bonus; summed across contributing gaps, capped by GAP_TYPE_BONUS_CAP. */
export const GAP_TYPE_BONUS = {
  CAPABILITY_GAP: 12,
  PRODUCT_LINE_GAP: 10,
  TRAINING_GAP: 18,
  CROSS_SELL_OPPORTUNITY: 8,
  RETENTION_GAP: 18,
  UPGRADE_OPPORTUNITY: 0,
} as const;

export const GAP_TYPE_BONUS_CAP = 20;

/** Adjacent signal count from explanationData, scaled to this max. */
export const ADJACENCY_POINTS_MAX = 18;

/** Evidence ref contribution, scaled to this max. */
export const EVIDENCE_POINTS_MAX = 15;

/** CRM relationship modifiers (applied once per product opportunity). */
export const CRM_MODIFIERS = {
  formerMesoesteticDermaceutic: 12,
  existingNuviorCustomerSameFamily: 6,
  existingNuviorCustomerOther: 3,
  revisitDue: 4,
  dormantCustomer: -5,
  hasAcademyAccountTraining: 5,
} as const;

/** Scale catalog commercialPriority (0–100) into 0–COMMERCIAL_PRIORITY_MAX points. */
export const COMMERCIAL_PRIORITY_MAX = 10;

/** Training prerequisite bonus when TRAINING_GAP contributes. */
export const TRAINING_PREREQUISITE_BONUS = 12;

/** Extra boost when training must precede direct product sale (same family). */
export const TRAINING_PREREQUISITE_DOMINANCE_BONUS = 22;

/** Penalty on direct product when training gap exists for same family. */
export const DIRECT_PRODUCT_WHEN_TRAINING_REQUIRED_PENALTY = 18;

/** Uncertainty penalties (summed, capped). */
export const UNCERTAINTY_PENALTIES = {
  verificationRequired: 10,
  notFoundCritical: 8,
  ambiguousCritical: 5,
} as const;

export const UNCERTAINTY_PENALTY_CAP = 18;

/** Score display bands — product opportunity strength, not Account Fit. */
export const SCORE_BAND_THRESHOLDS = [
  { min: 85, band: "VERY_HIGH" as const },
  { min: 70, band: "HIGH" as const },
  { min: 50, band: "MEDIUM" as const },
  { min: 30, band: "LOW" as const },
  { min: 0, band: "VERY_LOW" as const },
];

export type ScoreBand = (typeof SCORE_BAND_THRESHOLDS)[number]["band"];

/** Minimum score for a product to become primary recommendation. */
export const PRIMARY_RECOMMENDATION_MIN_SCORE = 50;

/** Minimum score when primary depends on verification (still selectable as pending). */
export const PRIMARY_PENDING_VERIFICATION_MIN_SCORE = 45;

/** Confidence required for confirmed (non-pending) primary. */
export const PRIMARY_CONFIRMED_MIN_CONFIDENCE = "MEDIUM" as const;

export type OpportunityConfidence = "HIGH" | "MEDIUM" | "LOW";

export const CONFIDENCE_RANK: Record<OpportunityConfidence, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};
