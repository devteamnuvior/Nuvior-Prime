/**
 * Exact terminology from docs/NUVIOR_PRIME_SPEC.md — do not rename for display.
 */

export const UNKNOWN_VERIFY = "UNKNOWN, verify" as const;

export const CERTIFICATION_PATHWAY_LABELS = {
  THREE_LEVEL: "3-level",
  FOUR_LEVEL: "4-level",
  NONE: "none",
} as const;

export type CertificationPathwayCode = keyof typeof CERTIFICATION_PATHWAY_LABELS;

export const VISIT_TYPE_LABELS = {
  FIRST_VISIT: "first visit",
  RE_VISIT: "re-visit",
  FOLLOW_UP_ON_A_QUOTE: "follow-up on a quote",
} as const;

export const SEASON_LABELS = {
  WINTER: "Winter",
  SPRING: "Spring",
  SUMMER: "Summer",
  AUTUMN: "Autumn",
} as const;

export const PRICE_POSITIONING_LABELS = {
  VALUE: "value",
  MID: "mid",
  PREMIUM: "premium",
  UNKNOWN: "unknown",
} as const;

/** Spec §01 — active portfolio (Mesoestetic is not an ongoing line). */
export const ACTIVE_PORTFOLIO = [
  "Aptos",
  "Dermaceutic",
  "Fidia Hy-tissue PRP",
  "GESKE",
] as const;

export const COMPETITOR_DISTRIBUTORS = [
  "Clarion Medical",
  "Salient Medical",
  "Xcite Tech",
  "Avari Medical",
  "SkinHealth Canada",
  "Cartessa",
  "Prollenium",
] as const;
