/**
 * Field authority / merge precedence for multi-source CRM imports.
 * Higher number wins for that field group.
 */

export type CrmSourceKind = "accounts" | "academy" | "orders" | "dnc" | "visits";

/** Explicit precedence — higher wins; never let orders override DNC, etc. */
export const SOURCE_PRECEDENCE: Record<CrmSourceKind, number> = {
  dnc: 100,
  academy: 80,
  orders: 70,
  visits: 60,
  accounts: 50,
};

/**
 * Which source owns which canonical fields when merging.
 * Documented contract — do not silently invert.
 */
export const FIELD_SOURCE_AUTHORITY: Record<string, CrmSourceKind[]> = {
  doNotContact: ["dnc"],
  dncVerified: ["dnc"],
  hasAcademyAccount: ["academy"],
  aptosCertificationLevel: ["academy"],
  aptosPathway: ["academy"],
  staffEligibleFor4Level: ["academy"],
  lastOrderDate: ["orders"],
  historicalProductInterest: ["orders"],
  formerMesoesteticCustomer: ["orders", "accounts"],
  mesoesteticRetentionFlag: ["orders", "accounts"],
  lastVisitDate: ["visits", "accounts"],
  nextRevisitDueDate: ["visits", "accounts"],
  visitNotes: ["visits"],
  assignedRep: ["accounts"],
  businessName: ["accounts"],
  streetAddress: ["accounts"],
  city: ["accounts"],
  provinceCode: ["accounts"],
  postalCode: ["accounts"],
  phone: ["accounts"],
  email: ["accounts"],
  placeId: ["accounts"],
  websiteDomain: ["accounts"],
  internalStatus: ["accounts"],
  crmExternalId: ["accounts", "academy", "orders", "dnc", "visits"],
};

export type ImportAccountRow = {
  crmExternalId: string;
  businessName: string;
  streetAddress?: string | null;
  city?: string | null;
  provinceCode?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  placeId?: string | null;
  websiteDomain?: string | null;
  assignedRep?: string | null;
  internalStatus?: string | null;
  formerMesoesteticCustomer?: boolean | string | number | null;
  lastVisitDate?: string | null;
  nextRevisitDueDate?: string | null;
};

export type ImportAcademyRow = {
  crmExternalId: string;
  hasAcademyAccount?: boolean | string | number | null;
  aptosCertificationLevel?: string | null;
  aptosPathway?: string | null;
  staffEligibleFor4Level?: string | null;
};

export type ImportOrderRow = {
  crmExternalId: string;
  lastOrderDate?: string | null;
  historicalProductInterest?: string | null;
  /** If Y/true and no explicit former Meso flag on accounts */
  formerMesoesteticCustomer?: boolean | string | number | null;
  /** Optional product family list used only when deriving Meso flag deterministically */
  productFamilies?: string[] | null;
};

export type ImportDncRow = {
  crmExternalId: string;
  doNotContact: boolean | string | number;
};

export type ImportVisitRow = {
  crmExternalId: string;
  lastVisitDate?: string | null;
  nextRevisitDueDate?: string | null;
  visitNotes?: string | null;
};
