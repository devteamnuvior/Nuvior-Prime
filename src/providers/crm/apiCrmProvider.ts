/**
 * Reserved API mode — no vendor endpoints invented.
 * Fail-closed when CRM_API_BASE_URL is missing or unreachable.
 * Never falls back to mock customer data.
 */

import type {
  CrmInternalAccount,
  CrmProvider,
  CrmVisitHistoryItem,
} from "./types";

export class ApiCrmProvider implements CrmProvider {
  readonly name = "api";
  private reason: string;

  constructor(reason?: string) {
    const base = (process.env.CRM_API_BASE_URL ?? "").trim();
    if (!base) {
      this.reason =
        reason ??
        "CRM_PROVIDER=api but CRM_API_BASE_URL is not configured — no vendor API invented; use CRM_PROVIDER=import";
    } else {
      // Boundary only: do not call invented paths. Mark unavailable until a real contract is wired.
      this.reason =
        reason ??
        "CRM_API_BASE_URL is set but no NUVIOR CRM API contract is registered in-repo — refuse invented endpoints; use import";
    }
  }

  isUnavailable(): boolean {
    return true;
  }

  getUnavailableReason(): string {
    return this.reason;
  }

  async getById(): Promise<CrmInternalAccount | null> {
    return null;
  }
  async searchAccounts(): Promise<CrmInternalAccount[]> {
    return [];
  }
  async listAccounts(): Promise<CrmInternalAccount[]> {
    return [];
  }
  async getStatusForPlace(): Promise<CrmInternalAccount | null> {
    return null;
  }
  async getStatusByName(): Promise<CrmInternalAccount | null> {
    return null;
  }
  async getVisitHistory(): Promise<CrmVisitHistoryItem[]> {
    return [];
  }
  async getRevisitsDue(): Promise<CrmInternalAccount[]> {
    return [];
  }
  async getAlreadyVisitedNotDue(): Promise<CrmInternalAccount[]> {
    return [];
  }
}

/** Explicit unavailable provider (outage / misconfig) — empty, never mock. */
export class UnavailableCrmProvider implements CrmProvider {
  readonly name = "unavailable";
  constructor(private reason = "CRM marked unavailable") {}

  isUnavailable(): boolean {
    return true;
  }
  getUnavailableReason(): string {
    return this.reason;
  }
  async getById(): Promise<CrmInternalAccount | null> {
    return null;
  }
  async searchAccounts(): Promise<CrmInternalAccount[]> {
    return [];
  }
  async listAccounts(): Promise<CrmInternalAccount[]> {
    return [];
  }
  async getStatusForPlace(): Promise<CrmInternalAccount | null> {
    return null;
  }
  async getStatusByName(): Promise<CrmInternalAccount | null> {
    return null;
  }
  async getVisitHistory(): Promise<CrmVisitHistoryItem[]> {
    return [];
  }
  async getRevisitsDue(): Promise<CrmInternalAccount[]> {
    return [];
  }
  async getAlreadyVisitedNotDue(): Promise<CrmInternalAccount[]> {
    return [];
  }
}
