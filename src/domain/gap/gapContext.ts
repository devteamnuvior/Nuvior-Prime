/**
 * CRM and scope context for deterministic gap analysis (Stage D).
 */

import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";
import type { ClinicCapabilityProfile } from "@/domain/research/clinicCapabilityProfile";
import type { NuviorProduct } from "@/domain/products/nuviorProduct";
import { createHash } from "node:crypto";

export type GapCrmContext = {
  doNotContact: boolean;
  formerMesoesteticCustomer: boolean;
  hasAcademyAccount: boolean;
  aptosCertificationLevel: string | null;
  historicalProductInterest: string | null;
  /** Authoritative CRM: account carries an active NUVIOR product relationship. */
  existingNuviorCustomer: boolean;
  /** Product families already on contract (CRM truth). */
  activeNuviorFamilies: string[];
};

export type GapAnalysisInput = {
  profile: ClinicCapabilityProfile;
  catalog: NuviorProduct[];
  catalogVersion: string;
  provinceCode: string;
  credentials: AccountCredentialSignals;
  crm: GapCrmContext;
  analyzedAt?: string;
};

export const DEFAULT_GAP_CRM_CONTEXT: GapCrmContext = {
  doNotContact: false,
  formerMesoesteticCustomer: false,
  hasAcademyAccount: false,
  aptosCertificationLevel: null,
  historicalProductInterest: null,
  existingNuviorCustomer: false,
  activeNuviorFamilies: [],
};

/** Derive credential signals from researched practitioner types (scope gates still apply). */
export function credentialsFromProfile(profile: ClinicCapabilityProfile): AccountCredentialSignals {
  const types = profile.practitionerTypes.map((p) => p.normalizedValue.toLowerCase());
  const practitioners = profile.practitioners.map((p) => p.normalizedValue.toLowerCase());
  const haystack = [...types, ...practitioners].join(" ");

  const hasPhysicianOrNp =
    /\b(md|physician|doctor|np|nurse practitioner)\b/.test(haystack);
  const hasRn = /\brn\b|registered nurse/.test(haystack);
  const hasNd = /\bnd\b|naturopath/.test(haystack);
  const hasImg = /\bimg\b|international medical graduate/.test(haystack);
  const hasAllied =
    /\ballied\b|aesthetician|esthetician|physio|chiropractor|kinesiolog/.test(haystack);

  return {
    hasPhysicianOrNp,
    hasRn,
    hasNd,
    hasImg,
    hasAllied,
    physicianOrNpOnSiteForPrp: hasPhysicianOrNp,
    rnHasPhysicianDirective: false,
  };
}

/** Stable hash for CRM fields that affect gap analysis. */
export function hashGapCrmContext(crm: GapCrmContext): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        dnc: crm.doNotContact,
        formerMeso: crm.formerMesoesteticCustomer,
        academy: crm.hasAcademyAccount,
        aptosCert: crm.aptosCertificationLevel ?? "",
        hist: crm.historicalProductInterest ?? "",
        existing: crm.existingNuviorCustomer,
        families: [...crm.activeNuviorFamilies].sort(),
      }),
    )
    .digest("hex")
    .slice(0, 16);
}

export function gapAnalysisCacheKey(input: {
  profileVersion: string;
  catalogVersion: string;
  gapRulesVersion: string;
  crmContextHash: string;
}): string {
  return [
    input.profileVersion,
    input.catalogVersion,
    input.gapRulesVersion,
    input.crmContextHash,
  ].join("|");
}
