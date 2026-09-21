/**
 * Deterministic NUVIOR product capability taxonomy (v1).
 * Gap analysis and Claude extraction must map into these codes — not invent new ones.
 * @see docs/ODOO_PRODUCT_CATALOG.md
 */

export const CAPABILITY_TAXONOMY_VERSION = "1.0.0" as const;

export const CAPABILITY_TAGS = [
  "THREAD_LIFTING",
  "PROFESSIONAL_PEEL",
  "PIGMENTATION_CORRECTION",
  "ACNE_PROTOCOL",
  "MEDICAL_GRADE_SKINCARE",
  "PRP_HAIR",
  "PRP_REGENERATIVE",
  "RETAIL_BEAUTY_DEVICE",
  "TRAINING_CERTIFICATION",
] as const;

export type CapabilityTag = (typeof CAPABILITY_TAGS)[number];

const TAG_SET = new Set<string>(CAPABILITY_TAGS);

export function isCapabilityTag(value: string): value is CapabilityTag {
  return TAG_SET.has(value);
}

/** Reject unknown tags — LLM/research stages must normalize into this set. */
export function assertCapabilityTags(tags: readonly string[]): CapabilityTag[] {
  const out: CapabilityTag[] = [];
  for (const t of tags) {
    if (!isCapabilityTag(t)) {
      throw new Error(`Unknown capability tag "${t}" — not in taxonomy v${CAPABILITY_TAXONOMY_VERSION}`);
    }
    out.push(t);
  }
  return out;
}

export const CAPABILITY_TAG_LABELS: Record<CapabilityTag, string> = {
  THREAD_LIFTING: "Thread lifting",
  PROFESSIONAL_PEEL: "Professional peel",
  PIGMENTATION_CORRECTION: "Pigmentation correction",
  ACNE_PROTOCOL: "Acne protocol",
  MEDICAL_GRADE_SKINCARE: "Medical-grade skincare",
  PRP_HAIR: "PRP hair restoration",
  PRP_REGENERATIVE: "PRP regenerative",
  RETAIL_BEAUTY_DEVICE: "Retail beauty device",
  TRAINING_CERTIFICATION: "Training / certification",
};
