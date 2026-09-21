import type {
  CrmInternalAccount,
  CrmProvider,
  CrmSearchQuery,
  CrmVisitHistoryItem,
} from "./types";
import {
  MOCK_CRM_ACCOUNTS,
  MOCK_CRM_AS_OF,
  MOCK_CRM_VISIT_HISTORY,
} from "./mockCrmData";

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function postalNorm(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, "").toUpperCase();
}

function phoneNorm(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

/**
 * In-memory mock CRM. Set CRM_UNAVAILABLE=true to simulate outage.
 */
export class MockCrmProvider implements CrmProvider {
  readonly name = "mock";
  private unavailable: boolean;

  constructor(unavailable = (process.env.CRM_UNAVAILABLE ?? "false").toLowerCase() === "true") {
    this.unavailable = unavailable;
  }

  isUnavailable(): boolean {
    return this.unavailable;
  }

  private guard(): CrmInternalAccount[] {
    if (this.unavailable) return [];
    return MOCK_CRM_ACCOUNTS;
  }

  async getById(crmExternalId: string): Promise<CrmInternalAccount | null> {
    return this.guard().find((a) => a.crmExternalId === crmExternalId) ?? null;
  }

  async listAccounts(): Promise<CrmInternalAccount[]> {
    return [...this.guard()];
  }

  async searchAccounts(query: CrmSearchQuery): Promise<CrmInternalAccount[]> {
    const all = this.guard();
    return all.filter((a) => {
      if (query.placeId && a.placeId === query.placeId) return true;
      if (query.businessName && norm(a.businessName) === norm(query.businessName)) return true;
      if (query.postalCode && postalNorm(a.postalCode) === postalNorm(query.postalCode)) {
        if (!query.businessName) return true;
        return norm(a.businessName).includes(norm(query.businessName)) ||
          norm(query.businessName).includes(norm(a.businessName));
      }
      if (query.streetAddress && norm(a.streetAddress) === norm(query.streetAddress)) return true;
      if (query.phone && phoneNorm(a.phone) && phoneNorm(a.phone) === phoneNorm(query.phone)) {
        return true;
      }
      if (query.email && norm(a.email) === norm(query.email)) return true;
      if (query.provinceCode && a.provinceCode !== query.provinceCode) return false;
      return false;
    });
  }

  async getStatusForPlace(
    placeId: string,
    businessName: string,
  ): Promise<CrmInternalAccount | null> {
    const all = this.guard();
    return (
      all.find((a) => a.placeId === placeId) ??
      all.find((a) => norm(a.businessName) === norm(businessName)) ??
      null
    );
  }

  async getStatusByName(businessName: string): Promise<CrmInternalAccount | null> {
    return this.guard().find((a) => norm(a.businessName) === norm(businessName)) ?? null;
  }

  async getVisitHistory(crmExternalId: string): Promise<CrmVisitHistoryItem[]> {
    if (this.unavailable) return [];
    return MOCK_CRM_VISIT_HISTORY[crmExternalId] ?? [];
  }

  async getRevisitsDue(asOfDate: string, provinceCode?: string): Promise<CrmInternalAccount[]> {
    return this.guard().filter((a) => {
      if (a.doNotContact) return false;
      if (provinceCode && a.provinceCode !== provinceCode) return false;
      return a.nextRevisitDueDate != null && a.nextRevisitDueDate <= asOfDate;
    });
  }

  async getAlreadyVisitedNotDue(
    asOfDate: string,
    provinceCode?: string,
  ): Promise<CrmInternalAccount[]> {
    // Only exclude when CRM explicitly schedules a future revisit (visited, not yet due).
    // lastVisit without nextRevisitDueDate does not imply permanent exclusion.
    return this.guard().filter((a) => {
      if (a.doNotContact) return false;
      if (provinceCode && a.provinceCode !== provinceCode) return false;
      if (!a.lastVisitDate || !a.nextRevisitDueDate) return false;
      return a.nextRevisitDueDate > asOfDate;
    });
  }
}

export { MOCK_CRM_AS_OF };
