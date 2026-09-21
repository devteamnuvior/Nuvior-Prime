/**
 * Hard gates and certification appropriateness checks.
 */

import { isProductRecommendable } from "@/domain/products/eligibility";
import type { NuviorProduct } from "@/domain/products/nuviorProduct";
import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";
import type { GapCrmContext } from "@/domain/gap/gapContext";
import type { ProductGap } from "@/domain/gap/productGapAnalysis";
import { CATALOG_PRODUCT_IDS } from "@/domain/products/leadProductCompat";

export type HardGateResult =
  | { passed: true }
  | { passed: false; reasons: string[]; eligibilityState: "BLOCKED_CATALOG" | "BLOCKED_SCOPE" };

export function applyHardGates(
  product: NuviorProduct,
  gaps: ProductGap[],
  input: {
    provinceCode: string;
    credentials: AccountCredentialSignals;
    crm: GapCrmContext;
  },
): HardGateResult {
  const reasons: string[] = [];

  if (product.id === CATALOG_PRODUCT_IDS.MESOESTETIC_HISTORICAL || product.productFamily === "MESOESTETIC") {
    return {
      passed: false,
      reasons: ["Mesoestetic must not be recommended as an ongoing NUVIOR line."],
      eligibilityState: "BLOCKED_CATALOG",
    };
  }

  const hasTrainingGap = gaps.some((g) => g.gapType === "TRAINING_GAP");
  const allowTraining = product.trainingRequired && hasTrainingGap;

  const rec = isProductRecommendable(product, {
    provinceCode: input.provinceCode,
    credentials: input.credentials,
    allowTrainingProducts: allowTraining,
  });

  if (!rec.eligible) {
    const scopeBlocked = rec.reasons.some((r) => r.includes("scope"));
    return {
      passed: false,
      reasons: rec.reasons,
      eligibilityState: scopeBlocked ? "BLOCKED_SCOPE" : "BLOCKED_CATALOG",
    };
  }

  if (product.trainingRequired && !isCertificationLevelAppropriate(product, input.crm)) {
    reasons.push("CRM indicates equal or higher certification already achieved.");
    return { passed: false, reasons, eligibilityState: "BLOCKED_CATALOG" };
  }

  const gapBlocked = gaps.every(
    (g) => g.eligibilityState === "BLOCKED_SCOPE" || g.eligibilityState === "BLOCKED_CATALOG",
  );
  if (gaps.length > 0 && gapBlocked) {
    return {
      passed: false,
      reasons: ["All contributing gaps are catalog/scope blocked."],
      eligibilityState: "BLOCKED_SCOPE",
    };
  }

  return { passed: true };
}

/** Do not recommend a lower certification level than CRM indicates. */
export function isCertificationLevelAppropriate(
  product: NuviorProduct,
  crm: GapCrmContext,
): boolean {
  if (!product.trainingRequired) return true;

  const level = (crm.aptosCertificationLevel ?? "").toLowerCase();
  if (!level && !crm.hasAcademyAccount) return true;

  if (level.includes("4") || level.includes("four")) {
    return false;
  }

  if (
    (level.includes("3") || level.includes("three")) &&
    product.certificationPathway === "THREE_LEVEL"
  ) {
    return false;
  }

  if (crm.hasAcademyAccount && level.includes("cert")) {
    if (product.id === CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION) return false;
  }

  return true;
}

export function mergeGapEligibility(
  gaps: ProductGap[],
  crm: GapCrmContext,
): "ELIGIBLE" | "BLOCKED_DNC" | "BLOCKED_SCOPE" | "BLOCKED_CATALOG" {
  if (crm.doNotContact) return "BLOCKED_DNC";
  if (gaps.some((g) => g.eligibilityState === "BLOCKED_SCOPE")) return "BLOCKED_SCOPE";
  if (gaps.some((g) => g.eligibilityState === "BLOCKED_CATALOG")) return "BLOCKED_CATALOG";
  return "ELIGIBLE";
}
