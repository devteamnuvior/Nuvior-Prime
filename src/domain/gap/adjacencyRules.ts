/**
 * Deterministic adjacency rules — gap engine only, not Claude.
 * @see docs/PRODUCT_GAP_ENGINE.md
 */

import type { CapabilityTag } from "@/domain/products/capabilityTaxonomy";
import type { ProductFamilyCode } from "@/domain/products/nuviorProduct";
import { CATALOG_PRODUCT_IDS } from "@/domain/products/leadProductCompat";

export type AdjacencyRule = {
  id: string;
  targetCapability: CapabilityTag;
  productFamily: ProductFamilyCode;
  /** Primary family product for gap association (not every SKU). */
  primaryProductId: string;
  /** Capability tags that count as adjacent presence. */
  adjacentCapabilityTags: CapabilityTag[];
  /** Service/brand keyword signals (normalized lowercase match). */
  adjacentKeywords: string[];
  /** Gap types this rule may emit (excluding CRM-only types). */
  allowedGapTypes: ("CAPABILITY_GAP" | "PRODUCT_LINE_GAP")[];
};

export const ADJACENCY_RULES: AdjacencyRule[] = [
  {
    id: "aptos-thread-from-injectables",
    targetCapability: "THREAD_LIFTING",
    productFamily: "APTOS",
    primaryProductId: CATALOG_PRODUCT_IDS.APTOS,
    adjacentCapabilityTags: [],
    adjacentKeywords: [
      "botox",
      "filler",
      "injectable",
      "toxin",
      "dermal filler",
      "facial aesthetics",
      "facial rejuvenation",
      "non-surgical",
      "juvederm",
      "restylene",
      "restylane",
    ],
    allowedGapTypes: ["CAPABILITY_GAP"],
  },
  {
    id: "dermaceutic-skincare-line",
    targetCapability: "MEDICAL_GRADE_SKINCARE",
    productFamily: "DERMACEUTIC",
    primaryProductId: CATALOG_PRODUCT_IDS.DERMACEUTIC,
    adjacentCapabilityTags: [
      "PROFESSIONAL_PEEL",
      "PIGMENTATION_CORRECTION",
      "ACNE_PROTOCOL",
    ],
    adjacentKeywords: [
      "chemical peel",
      "professional peel",
      "pigmentation",
      "acne protocol",
      "corrective facial",
      "cosmeceutical",
      "skincare line",
      "skinceuticals",
      "zo skin",
      "obagi",
      "alumiermd",
    ],
    allowedGapTypes: ["CAPABILITY_GAP", "PRODUCT_LINE_GAP"],
  },
  {
    id: "dermaceutic-peel-adjacency",
    targetCapability: "PROFESSIONAL_PEEL",
    productFamily: "DERMACEUTIC",
    primaryProductId: CATALOG_PRODUCT_IDS.DERMACEUTIC,
    adjacentCapabilityTags: ["PIGMENTATION_CORRECTION", "MEDICAL_GRADE_SKINCARE"],
    adjacentKeywords: ["chemical peel", "professional peel", "tca", "glycolic peel"],
    allowedGapTypes: ["CAPABILITY_GAP", "PRODUCT_LINE_GAP"],
  },
  {
    id: "fidia-prp-adjacency",
    targetCapability: "PRP_REGENERATIVE",
    productFamily: "FIDIA_HY_TISSUE_PRP",
    primaryProductId: CATALOG_PRODUCT_IDS.FIDIA_HY_TISSUE_PRP,
    adjacentCapabilityTags: ["PRP_HAIR"],
    adjacentKeywords: [
      "prp",
      "platelet rich plasma",
      "hair restoration",
      "regenerative",
      "orthobiologics",
      "sports medicine",
      "vampire facial",
    ],
    allowedGapTypes: ["CAPABILITY_GAP", "PRODUCT_LINE_GAP"],
  },
  {
    id: "geske-retail-device",
    targetCapability: "RETAIL_BEAUTY_DEVICE",
    productFamily: "GESKE",
    primaryProductId: CATALOG_PRODUCT_IDS.GESKE,
    adjacentCapabilityTags: [],
    adjacentKeywords: [
      "retail",
      "skincare boutique",
      "beauty device",
      "spa retail",
      "at-home",
      "led mask",
      "facial cleansing brush",
      "skincare gift",
    ],
    allowedGapTypes: ["CAPABILITY_GAP"],
  },
];

/** Maps product family to retention cross-sell when former Meso. */
export const RETENTION_FAMILY = {
  trigger: "former_mesoestetic_customer",
  productFamily: "DERMACEUTIC" as ProductFamilyCode,
  primaryProductId: CATALOG_PRODUCT_IDS.DERMACEUTIC,
  capability: "MEDICAL_GRADE_SKINCARE" as CapabilityTag,
};

export const TRAINING_GAP_RULE = {
  id: "aptos-certification-training",
  productFamily: "APTOS" as ProductFamilyCode,
  certificationProductIds: [
    CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION,
    CATALOG_PRODUCT_IDS.APTOS_4_LEVEL_CERTIFICATION,
  ],
  targetCapability: "TRAINING_CERTIFICATION" as CapabilityTag,
  threadCapability: "THREAD_LIFTING" as CapabilityTag,
};
