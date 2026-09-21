import type { CertificationPathwayCode } from "@/domain/terminology";
import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";

/** CRM-owned internal account — never invent from web. */
export type CrmInternalAccount = {
  crmExternalId: string;
  businessName: string;
  streetAddress: string | null;
  city: string | null;
  provinceCode: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  placeId: string | null;
  websiteDomain: string | null;
  assignedRep: string | null;
  internalStatus: string | null;
  hasAcademyAccount: boolean | null;
  aptosCertificationLevel: string | null;
  aptosPathway: CertificationPathwayCode;
  staffEligibleFor4Level: string | null;
  formerMesoesteticCustomer: boolean;
  mesoesteticRetentionFlag: boolean;
  lastOrderDate: string | null; // ISO date
  /**
   * Authoritative DNC=true only when `dncVerified`.
   * When `dncVerified` is false, treat contact status as unverified (not safe).
   */
  doNotContact: boolean;
  /** False when DNC master missing/unavailable for this account — fail-safe. */
  dncVerified: boolean;
  lastVisitDate: string | null;
  nextRevisitDueDate: string | null;
  visitNotes: string | null;
  historicalProductInterest: string | null;
  /** Credential signals known to CRM (staff roster) — not scraped. */
  credentials: AccountCredentialSignals;
};

export type CrmVisitHistoryItem = {
  visitDate: string;
  visitType: string;
  outcome: string | null;
  notes: string | null;
  peopleMet: string | null;
  productsDiscussed: string | null;
};

export type CrmSearchQuery = {
  businessName?: string;
  postalCode?: string;
  streetAddress?: string;
  phone?: string;
  email?: string;
  placeId?: string;
  provinceCode?: string;
};

/**
 * Pluggable CRM — mock for tests; real adapters later (REST / DB view / CSV / mirror).
 * Do not invent vendor endpoints.
 */
export interface CrmProvider {
  readonly name: string;
  /** True when provider could not load internal data this run. */
  isUnavailable(): boolean;

  getById(crmExternalId: string): Promise<CrmInternalAccount | null>;
  searchAccounts(query: CrmSearchQuery): Promise<CrmInternalAccount[]>;
  listAccounts(): Promise<CrmInternalAccount[]>;

  getStatusForPlace(placeId: string, businessName: string): Promise<CrmInternalAccount | null>;
  getStatusByName(businessName: string): Promise<CrmInternalAccount | null>;

  getVisitHistory(crmExternalId: string): Promise<CrmVisitHistoryItem[]>;
  getRevisitsDue(asOfDate: string, provinceCode?: string): Promise<CrmInternalAccount[]>;
  getAlreadyVisitedNotDue(asOfDate: string, provinceCode?: string): Promise<CrmInternalAccount[]>;
}

/** @deprecated clinical fields — prefer enrichment; kept for fixture bridging */
export type CrmAccountStatus = CrmInternalAccount & {
  advertisesThreadLifting: boolean | null;
  pricePositioning: "value" | "mid" | "premium" | "unknown";
  injectablesOffered: string;
  threadsOffered: string;
  skincareLines: string;
  serviceMenuSummary: string;
  practitioners: {
    name: string;
    credentials: string;
    role: string;
    performsInjectables: boolean | null;
  }[];
};
