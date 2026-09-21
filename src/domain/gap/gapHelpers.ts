/**
 * Shared helpers for deterministic gap evaluation.
 */

import { createHash } from "node:crypto";
import { isProductRecommendable } from "@/domain/products/eligibility";
import type { NuviorProduct, ProductFamilyCode } from "@/domain/products/nuviorProduct";
import { evaluateScopeOfPractice } from "@/domain/scopeOfPractice";
import type { InventoryState } from "@/domain/research/clinicCapabilityProfile";
import type { GapAnalysisInput } from "./gapContext";
import type { GapEligibilityState } from "./productGapAnalysis";
import {
  hasAdjacentKeywordSignal,
  type ProfileInventory,
} from "./profileInventory";

export const COMPETITOR_SKINCARE_KEYWORDS = [
  "skinceuticals",
  "zo skin",
  "obagi",
  "alumiermd",
  "mesoestetic",
  "is clinical",
];

export const NUVIOR_LINE_KEYWORDS: Record<ProductFamilyCode, string[]> = {
  APTOS: ["aptos", "pdo thread"],
  DERMACEUTIC: ["dermaceutic"],
  FIDIA_HY_TISSUE_PRP: ["fidia", "hy-tissue", "hy tissue"],
  GESKE: ["geske"],
  MESOESTETIC: ["mesoestetic"],
};

export function gapId(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

export function countKeywordHits(inventory: ProfileInventory, keywords: string[]): number {
  const haystack = [
    ...inventory.serviceKeywords,
    ...inventory.brandNames,
    ...inventory.clinicalFocusKeywords,
  ].join(" ");
  return keywords.filter((k) => haystack.includes(k.toLowerCase())).length;
}

export function practitionerConfirmed(inventory: ProfileInventory): boolean {
  return inventory.practitionerTypes.length > 0 || inventory.presentCapabilities.length > 0;
}

export function resolveFamilyProductIds(
  catalog: NuviorProduct[],
  family: ProductFamilyCode,
  primaryProductId: string,
  input: GapAnalysisInput,
  allowTraining: boolean,
): { productIds: string[]; eligibility: GapEligibilityState; blockingReasons: string[] } {
  const blockingReasons: string[] = [];
  const familyProducts = catalog.filter((p) => p.productFamily === family);
  const primary = catalog.find((p) => p.id === primaryProductId);

  if (!primary) {
    return {
      productIds: [],
      eligibility: "BLOCKED_CATALOG",
      blockingReasons: ["Primary family product not in catalog."],
    };
  }

  if (primary.productFamily === "MESOESTETIC") {
    return {
      productIds: [],
      eligibility: "BLOCKED_CATALOG",
      blockingReasons: ["Mesoestetic must not appear as ongoing NUVIOR recommendation."],
    };
  }

  const rec = isProductRecommendable(primary, {
    provinceCode: input.provinceCode,
    credentials: input.credentials,
    allowTrainingProducts: allowTraining,
  });

  if (!rec.eligible) {
    blockingReasons.push(...rec.reasons);
    return { productIds: [], eligibility: "BLOCKED_CATALOG", blockingReasons };
  }

  const inactiveBlocked = familyProducts.filter(
    (p) => p.id !== primary.id && (!p.active || !p.sellable || !p.recommendable),
  );
  if (inactiveBlocked.length > 0) {
    blockingReasons.push(
      `Excluded ${inactiveBlocked.length} inactive/non-sellable SKU(s) from family aggregation.`,
    );
  }

  return { productIds: [primary.id], eligibility: "ELIGIBLE", blockingReasons };
}

export function scopeAllowsFamily(
  family: ProductFamilyCode,
  provinceCode: string,
  credentials: GapAnalysisInput["credentials"],
): { allowed: boolean; scopeBlocked: boolean; notes: string[] } {
  const scope = evaluateScopeOfPractice(provinceCode, credentials);
  if (family === "APTOS" && !scope.aptosProductAllowed && !scope.aptosCertificationLeadOk) {
    return { allowed: false, scopeBlocked: true, notes: scope.notes };
  }
  if (family === "FIDIA_HY_TISSUE_PRP" && !scope.fidiaAllowed) {
    return { allowed: false, scopeBlocked: true, notes: scope.notes };
  }
  return { allowed: true, scopeBlocked: false, notes: scope.notes };
}

export function hasCompetitorSkincareLine(inventory: ProfileInventory): boolean {
  return hasAdjacentKeywordSignal(inventory, COMPETITOR_SKINCARE_KEYWORDS);
}

export function hasNuviorFamilySignal(
  inventory: ProfileInventory,
  family: ProductFamilyCode,
): boolean {
  return hasAdjacentKeywordSignal(inventory, NUVIOR_LINE_KEYWORDS[family] ?? []);
}

export function statesAllowGapTarget(state: InventoryState): boolean {
  return state === "NOT_FOUND" || state === "CONFIRMED_ABSENT" || state === "AMBIGUOUS";
}

export function dedupeGaps<T extends { gapType: string; capability: string | null; relevantProductIds: string[] }>(
  gaps: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const g of gaps) {
    const key = `${g.gapType}:${g.capability}:${g.relevantProductIds.join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  return out;
}

export function collectNoClearGapReasons(
  inventory: ProfileInventory,
  gapCount: number,
): string[] {
  if (gapCount > 0) return [];
  const reasons: string[] = [];
  if (inventory.unknownCoverage) {
    reasons.push("Insufficient public evidence — mostly UNKNOWN inventory states.");
  }
  if (inventory.presentCapabilities.length === 0 && inventory.serviceKeywords.length === 0) {
    reasons.push("No confirmed capabilities or services in reviewed profile.");
  }
  if (reasons.length === 0) {
    reasons.push("No deterministic adjacency rule matched with sufficient evidence.");
  }
  return reasons;
}
