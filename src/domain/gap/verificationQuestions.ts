/**
 * Deterministic verification question templates by capability / gap type.
 */

import type { CapabilityTag } from "@/domain/products/capabilityTaxonomy";
import type { GapType } from "./productGapAnalysis";

const TEMPLATES: Partial<Record<CapabilityTag, string>> = {
  THREAD_LIFTING:
    "Are you currently offering thread lifting or referring those patients elsewhere?",
  PRP_REGENERATIVE: "Which PRP system are you currently using?",
  PRP_HAIR: "Which PRP system are you using for hair restoration?",
  MEDICAL_GRADE_SKINCARE:
    "Which professional peel and corrective skincare lines are you using today?",
  PROFESSIONAL_PEEL: "Which professional peel lines do you currently carry in-clinic?",
  RETAIL_BEAUTY_DEVICE:
    "Do you retail at-home beauty devices, and which lines do you carry?",
  PIGMENTATION_CORRECTION:
    "Which pigmentation or depigmentation protocols do you currently offer?",
  ACNE_PROTOCOL: "Which professional acne protocols or product lines do you use?",
};

export function verificationQuestionFor(
  capability: CapabilityTag | null,
  gapType: GapType,
  targetState: string | null,
): string | null {
  if (gapType === "RETENTION_GAP") {
    return "How are you managing your professional skincare and peel protocols since Mesoestetic supply changes?";
  }
  if (gapType === "TRAINING_GAP") {
    return "What is your current Aptos certification status for thread procedures?";
  }
  if (gapType === "CROSS_SELL_OPPORTUNITY") {
    return "Which NUVIOR lines are you currently not carrying that might fit your menu?";
  }
  if (targetState === "NOT_FOUND" || targetState === "AMBIGUOUS") {
    if (capability && TEMPLATES[capability]) return TEMPLATES[capability]!;
    return capability
      ? `Can you confirm whether you offer ${capability.replace(/_/g, " ").toLowerCase()}?`
      : null;
  }
  return null;
}
