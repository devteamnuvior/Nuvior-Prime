/**
 * Compatibility between legacy LeadProductCode (Phase 1–8 qualification)
 * and canonical NuviorProduct catalog IDs.
 *
 * Qualification continues to use LeadProductCode; gap analysis (Stage C+)
 * references catalog product IDs via this layer.
 */

import type { LeadProductCode } from "@/domain/terminology";
import type { NuviorProduct, ProductFamilyCode } from "./nuviorProduct";

/** Primary catalog product id per portfolio family (mock + future Odoo). */
export const CATALOG_PRODUCT_IDS = {
  APTOS: "nuvior-aptos-threads",
  DERMACEUTIC: "nuvior-dermaceutic-professional",
  FIDIA_HY_TISSUE_PRP: "nuvior-fidia-hy-tissue-prp",
  GESKE: "nuvior-geske-retail",
  APTOS_3_LEVEL_CERTIFICATION: "nuvior-aptos-cert-3-level",
  APTOS_4_LEVEL_CERTIFICATION: "nuvior-aptos-cert-4-level",
  MESOESTETIC_HISTORICAL: "nuvior-mesoestetic-historical-stock",
} as const;

const LEAD_TO_CATALOG: Record<LeadProductCode, string> = {
  APTOS: CATALOG_PRODUCT_IDS.APTOS,
  DERMACEUTIC: CATALOG_PRODUCT_IDS.DERMACEUTIC,
  FIDIA_HY_TISSUE_PRP: CATALOG_PRODUCT_IDS.FIDIA_HY_TISSUE_PRP,
  GESKE: CATALOG_PRODUCT_IDS.GESKE,
  APTOS_3_LEVEL_CERTIFICATION: CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION,
  APTOS_4_LEVEL_CERTIFICATION: CATALOG_PRODUCT_IDS.APTOS_4_LEVEL_CERTIFICATION,
};

const CATALOG_TO_LEAD: Record<string, LeadProductCode> = Object.fromEntries(
  Object.entries(LEAD_TO_CATALOG).map(([lead, id]) => [id, lead as LeadProductCode]),
) as Record<string, LeadProductCode>;

/** Map qualification lead product → canonical catalog id. */
export function leadProductToCatalogId(lead: LeadProductCode): string {
  return LEAD_TO_CATALOG[lead];
}

/** Resolve catalog product → lead product when a 1:1 mapping exists. */
export function catalogProductToLeadProduct(product: NuviorProduct): LeadProductCode | null {
  return CATALOG_TO_LEAD[product.id] ?? null;
}

/** Portfolio family for a legacy lead code (certification maps to APTOS family). */
export function leadProductToFamily(lead: LeadProductCode): ProductFamilyCode {
  if (lead.startsWith("APTOS")) return "APTOS";
  if (lead === "DERMACEUTIC") return "DERMACEUTIC";
  if (lead === "FIDIA_HY_TISSUE_PRP") return "FIDIA_HY_TISSUE_PRP";
  return "GESKE";
}

/** Find catalog product by legacy lead code from a loaded catalog snapshot. */
export function findCatalogProductForLead(
  products: NuviorProduct[],
  lead: LeadProductCode,
): NuviorProduct | undefined {
  const id = leadProductToCatalogId(lead);
  return products.find((p) => p.id === id);
}
