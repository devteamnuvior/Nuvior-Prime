/**
 * Deterministic product recommendation eligibility — not opportunity scoring.
 * Enforces catalog state, scope, and Mesoestetic prohibition.
 */

import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";
import { evaluateScopeOfPractice } from "@/domain/scopeOfPractice";
import type { NuviorProduct } from "./nuviorProduct";

export type RecommendabilityContext = {
  provinceCode: string;
  credentials: AccountCredentialSignals;
  /** When true, training/certification products may be eligible. */
  allowTrainingProducts?: boolean;
};

export type RecommendabilityResult = {
  eligible: boolean;
  reasons: string[];
};

const BLOCKED_AVAILABILITY = new Set(["DISCONTINUED", "OUT_OF_STOCK"]);

export function isProductRecommendable(
  product: NuviorProduct,
  context: RecommendabilityContext,
): RecommendabilityResult {
  const reasons: string[] = [];

  if (!product.recommendable) {
    reasons.push("Product is marked non-recommendable (e.g. Mesoestetic ongoing line).");
  }
  if (!product.active) {
    reasons.push("Product is inactive in catalog.");
  }
  if (!product.sellable) {
    reasons.push("Product is not sellable.");
  }
  if (BLOCKED_AVAILABILITY.has(product.availabilityStatus)) {
    reasons.push(`Availability status is ${product.availabilityStatus}.`);
  }
  if (product.productFamily === "MESOESTETIC") {
    reasons.push("Mesoestetic must not be recommended as an ongoing NUVIOR line.");
  }

  if (
    product.provinceRestrictions.length > 0 &&
    product.provinceRestrictions.includes(context.provinceCode)
  ) {
    reasons.push(`Product is restricted in province ${context.provinceCode}.`);
  }

  if (product.trainingRequired && !context.allowTrainingProducts) {
    reasons.push("Training/certification product requires explicit training context.");
  }

  const scope = evaluateScopeOfPractice(context.provinceCode, context.credentials);

  if (product.productFamily === "APTOS" && product.practitionerRequirements.includes("INJECTION_SCOPE")) {
    if (!scope.aptosProductAllowed && !scope.aptosCertificationLeadOk) {
      reasons.push("Provincial scope does not allow Aptos product or certification conversation.");
    }
  }

  if (product.productFamily === "FIDIA_HY_TISSUE_PRP" && product.practitionerRequirements.includes("INJECTION_SCOPE")) {
    if (!scope.fidiaAllowed) {
      reasons.push("Provincial scope does not allow Fidia Hy-tissue PRP.");
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

export function filterRecommendableProducts(
  products: NuviorProduct[],
  context: RecommendabilityContext,
): NuviorProduct[] {
  return products.filter((p) => isProductRecommendable(p, context).eligible);
}
