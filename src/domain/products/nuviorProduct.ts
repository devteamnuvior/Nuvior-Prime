/**
 * Canonical NUVIOR product — normalized from Odoo or mock catalog.
 * Domain code must never depend on Odoo RPC/ORM shapes.
 */

import type { CapabilityTag } from "./capabilityTaxonomy";
import { CAPABILITY_TAXONOMY_VERSION } from "./capabilityTaxonomy";

/** Portfolio family aligned with spec §01 — Mesoestetic is historical only. */
export type ProductFamilyCode =
  | "APTOS"
  | "DERMACEUTIC"
  | "FIDIA_HY_TISSUE_PRP"
  | "GESKE"
  | "MESOESTETIC";

export type ProductCatalogSource = "mock" | "odoo" | "cache";

export type AvailabilityStatus =
  | "AVAILABLE"
  | "LIMITED"
  | "DISCONTINUED"
  | "OUT_OF_STOCK"
  | "UNKNOWN";

export type PractitionerRequirement =
  | "PHYSICIAN_OR_NP"
  | "INJECTION_SCOPE"
  | "PHYSICIAN_NP_OR_ELIGIBLE_RN"
  | "NONE";

export type CertificationPathwayKind = "THREE_LEVEL" | "FOUR_LEVEL" | "NONE";

/** Approved internal positioning — not clinical indications invented from model knowledge. */
export type NuviorProduct = {
  /** Stable canonical ID within NUVIOR Prime. */
  id: string;
  /** Provider external ID (e.g. future Odoo product.template id). */
  externalId: string | null;
  sku: string | null;
  name: string;
  brand: string;
  productFamily: ProductFamilyCode;
  active: boolean;
  sellable: boolean;
  availabilityStatus: AvailabilityStatus;
  capabilityTags: CapabilityTag[];
  /** Taxonomy segment numbers (1–6) where this product is commercially relevant. */
  applicableSegments: number[];
  /** Service/menu categories this product aligns with (internal vocabulary). */
  relevantServices: string[];
  practitionerRequirements: PractitionerRequirement[];
  /** Province codes where sale/use conversation is restricted; empty = no extra restriction beyond scope engine. */
  provinceRestrictions: string[];
  trainingRequired: boolean;
  certificationPathway: CertificationPathwayKind;
  /** Approved positioning copy from internal/Odoo metadata — nullable until configured. */
  approvedPositioning: string | null;
  /** Internal commercial priority when explicitly configured (higher = more emphasis). */
  commercialPriority: number | null;
  /** When false, product must never appear in recommendations (Mesoestetic ongoing line). */
  recommendable: boolean;
  source: ProductCatalogSource;
  sourceUpdatedAt: string | null;
};

export type ProductFamilySummary = {
  code: ProductFamilyCode;
  displayName: string;
  brand: string;
  activeProductCount: number;
  recommendable: boolean;
};

export type ProductCatalogMetadata = {
  provider: string;
  source: ProductCatalogSource;
  fetchedAt: string;
  sourceUpdatedAt: string | null;
  catalogVersion: string;
  productCount: number;
  activeProductCount: number;
  capabilityTaxonomyVersion: typeof CAPABILITY_TAXONOMY_VERSION;
  stale: boolean;
  staleReason: string | null;
};
