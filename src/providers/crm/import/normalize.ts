/**
 * Normalize NUVIOR Prime CRM import rows → partial canonical accounts.
 * Never invent missing values.
 */

import type { CertificationPathwayCode } from "@/domain/terminology";
import type {
  ImportAccountRow,
  ImportAcademyRow,
  ImportDncRow,
  ImportOrderRow,
  ImportVisitRow,
} from "./types";

export type NormalizedPartial = {
  crmExternalId: string;
  businessName?: string;
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
  hasAcademyAccount?: boolean | null;
  aptosCertificationLevel?: string | null;
  aptosPathway?: CertificationPathwayCode;
  staffEligibleFor4Level?: string | null;
  formerMesoesteticCustomer?: boolean;
  mesoesteticRetentionFlag?: boolean;
  lastOrderDate?: string | null;
  doNotContact?: boolean | null;
  dncVerified?: boolean;
  lastVisitDate?: string | null;
  nextRevisitDueDate?: string | null;
  visitNotes?: string | null;
  historicalProductInterest?: string | null;
  parseErrors: string[];
  source: string;
};

export function parseBool(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (["y", "yes", "true", "1"].includes(s)) return true;
  if (["n", "no", "false", "0"].includes(s)) return false;
  return null;
}

export function normalizePostal(p: string | null | undefined): string | null {
  if (!p) return null;
  const n = p.replace(/\s+/g, "").toUpperCase();
  return n || null;
}

export function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  return d.length >= 10 ? d : p.trim() || null;
}

export function normalizeProvince(p: string | null | undefined): string | null {
  if (!p) return null;
  const s = p.trim().toUpperCase();
  if (s.length === 2) return s;
  const map: Record<string, string> = {
    ONTARIO: "ON",
    ALBERTA: "AB",
    "BRITISH COLUMBIA": "BC",
    QUEBEC: "QC",
  };
  return map[s] ?? (s.length <= 3 ? s : null);
}

export function normalizePathway(p: string | null | undefined): CertificationPathwayCode {
  if (!p) return "NONE";
  const s = p.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (s.includes("4") || s.includes("FOUR")) return "FOUR_LEVEL";
  if (s.includes("3") || s.includes("THREE")) return "THREE_LEVEL";
  if (s === "NONE" || s === "N/A") return "NONE";
  return "NONE";
}

export function normalizeIsoDate(d: string | null | undefined): string | null {
  if (!d || !String(d).trim()) return null;
  const s = String(d).trim();
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Deterministic former-Mesoestetic derivation from order product families
 * only when explicit flag absent. Documented rule: any family matching
 * /mesoestetic/i → true.
 */
export function deriveFormerMesoestetic(
  explicit: boolean | null,
  productFamilies: string[] | null | undefined,
): boolean | null {
  if (explicit != null) return explicit;
  if (!productFamilies?.length) return null;
  return productFamilies.some((f) => /mesoestetic/i.test(f));
}

export function normalizeAccountRow(row: ImportAccountRow): NormalizedPartial {
  const errors: string[] = [];
  if (!row.crmExternalId?.trim()) errors.push("crmExternalId required");
  if (!row.businessName?.trim()) errors.push("businessName required");
  const meso = parseBool(row.formerMesoesteticCustomer);
  return {
    crmExternalId: String(row.crmExternalId ?? "").trim(),
    businessName: row.businessName?.trim(),
    streetAddress: row.streetAddress?.trim() || null,
    city: row.city?.trim() || null,
    provinceCode: normalizeProvince(row.provinceCode),
    postalCode: normalizePostal(row.postalCode),
    phone: normalizePhone(row.phone),
    email: row.email?.trim().toLowerCase() || null,
    placeId: row.placeId?.trim() || null,
    websiteDomain: row.websiteDomain?.trim().toLowerCase() || null,
    assignedRep: row.assignedRep?.trim() || null,
    internalStatus: row.internalStatus?.trim() || null,
    formerMesoesteticCustomer: meso === true,
    mesoesteticRetentionFlag: meso === true,
    lastVisitDate: normalizeIsoDate(row.lastVisitDate ?? null),
    nextRevisitDueDate: normalizeIsoDate(row.nextRevisitDueDate ?? null),
    parseErrors: errors,
    source: "accounts",
  };
}

export function normalizeAcademyRow(row: ImportAcademyRow): NormalizedPartial {
  const errors: string[] = [];
  if (!row.crmExternalId?.trim()) errors.push("crmExternalId required");
  return {
    crmExternalId: String(row.crmExternalId ?? "").trim(),
    hasAcademyAccount: parseBool(row.hasAcademyAccount),
    aptosCertificationLevel: row.aptosCertificationLevel?.trim() || null,
    aptosPathway: normalizePathway(row.aptosPathway),
    staffEligibleFor4Level: row.staffEligibleFor4Level?.trim() || null,
    parseErrors: errors,
    source: "academy",
  };
}

export function normalizeOrderRow(row: ImportOrderRow): NormalizedPartial {
  const errors: string[] = [];
  if (!row.crmExternalId?.trim()) errors.push("crmExternalId required");
  const explicit = parseBool(row.formerMesoesteticCustomer);
  const derived = deriveFormerMesoestetic(explicit, row.productFamilies);
  return {
    crmExternalId: String(row.crmExternalId ?? "").trim(),
    lastOrderDate: normalizeIsoDate(row.lastOrderDate ?? null),
    historicalProductInterest: row.historicalProductInterest?.trim() || null,
    formerMesoesteticCustomer: derived === true,
    mesoesteticRetentionFlag: derived === true,
    parseErrors: errors,
    source: "orders",
  };
}

export function normalizeDncRow(row: ImportDncRow): NormalizedPartial {
  const errors: string[] = [];
  if (!row.crmExternalId?.trim()) errors.push("crmExternalId required");
  const dnc = parseBool(row.doNotContact);
  if (dnc === null) errors.push("doNotContact must be boolean-like");
  return {
    crmExternalId: String(row.crmExternalId ?? "").trim(),
    doNotContact: dnc,
    dncVerified: dnc !== null,
    parseErrors: errors,
    source: "dnc",
  };
}

export function normalizeVisitRow(row: ImportVisitRow): NormalizedPartial {
  const errors: string[] = [];
  if (!row.crmExternalId?.trim()) errors.push("crmExternalId required");
  return {
    crmExternalId: String(row.crmExternalId ?? "").trim(),
    lastVisitDate: normalizeIsoDate(row.lastVisitDate ?? null),
    nextRevisitDueDate: normalizeIsoDate(row.nextRevisitDueDate ?? null),
    visitNotes: row.visitNotes?.trim() || null,
    parseErrors: errors,
    source: "visits",
  };
}
