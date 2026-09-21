/**
 * Read-only CRM provider backed by CanonicalCrmAccount mirror (import path).
 * Never falls back to mock fixtures.
 */

import { prisma } from "@/lib/prisma";
import type {
  CrmInternalAccount,
  CrmProvider,
  CrmSearchQuery,
  CrmVisitHistoryItem,
} from "./types";
import { dbRowToCrmAccount } from "./import/toCrmAccount";

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function postalNorm(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, "").toUpperCase();
}

function phoneNorm(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

function ttlSeconds(): number {
  const n = Number(process.env.CRM_CACHE_TTL_SECONDS ?? "604800");
  return Number.isFinite(n) && n > 0 ? n : 604800;
}

export class ImportCrmProvider implements CrmProvider {
  readonly name = "import";
  private unavailableReason: string | null = null;
  private stale = false;
  private lastImportedAt: Date | null = null;

  constructor() {
    // Lazy health check on first use via ensureLoaded — sync ctor keeps factory simple.
  }

  isUnavailable(): boolean {
    return this.unavailableReason != null;
  }

  getUnavailableReason(): string | null {
    return this.unavailableReason;
  }

  isStale(): boolean {
    return this.stale;
  }

  getLastImportedAt(): Date | null {
    return this.lastImportedAt;
  }

  private async loadAll(): Promise<CrmInternalAccount[]> {
    try {
      const rows = await prisma.canonicalCrmAccount.findMany();
      if (rows.length === 0) {
        this.unavailableReason =
          "CRM import mirror empty — run crm:import with validated export files";
        return [];
      }
      const newest = rows.reduce(
        (max, r) => (r.importedAt > max ? r.importedAt : max),
        rows[0]!.importedAt,
      );
      this.lastImportedAt = newest;
      const ageSec = (Date.now() - newest.getTime()) / 1000;
      this.stale = ageSec > ttlSeconds();
      this.unavailableReason = null;
      return rows.map(dbRowToCrmAccount);
    } catch (e) {
      this.unavailableReason = `CRM import mirror unavailable: ${
        e instanceof Error ? e.message : String(e)
      }`;
      return [];
    }
  }

  async getById(crmExternalId: string): Promise<CrmInternalAccount | null> {
    const all = await this.loadAll();
    return all.find((a) => a.crmExternalId === crmExternalId) ?? null;
  }

  async listAccounts(): Promise<CrmInternalAccount[]> {
    return this.loadAll();
  }

  async searchAccounts(query: CrmSearchQuery): Promise<CrmInternalAccount[]> {
    const all = await this.loadAll();
    return all.filter((a) => {
      if (query.placeId && a.placeId === query.placeId) return true;
      if (query.businessName && norm(a.businessName) === norm(query.businessName)) return true;
      if (query.postalCode && postalNorm(a.postalCode) === postalNorm(query.postalCode)) {
        if (!query.businessName) return true;
        return (
          norm(a.businessName).includes(norm(query.businessName)) ||
          norm(query.businessName).includes(norm(a.businessName))
        );
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
    const all = await this.loadAll();
    return (
      all.find((a) => a.placeId === placeId) ??
      all.find((a) => norm(a.businessName) === norm(businessName)) ??
      null
    );
  }

  async getStatusByName(businessName: string): Promise<CrmInternalAccount | null> {
    const all = await this.loadAll();
    return all.find((a) => norm(a.businessName) === norm(businessName)) ?? null;
  }

  async getVisitHistory(crmExternalId: string): Promise<CrmVisitHistoryItem[]> {
    const a = await this.getById(crmExternalId);
    if (!a?.lastVisitDate) return [];
    return [
      {
        visitDate: a.lastVisitDate,
        visitType: "imported",
        outcome: null,
        notes: a.visitNotes,
        peopleMet: null,
        productsDiscussed: null,
      },
    ];
  }

  async getRevisitsDue(asOfDate: string, provinceCode?: string): Promise<CrmInternalAccount[]> {
    return (await this.loadAll()).filter((a) => {
      if (a.doNotContact && a.dncVerified) return false;
      if (provinceCode && a.provinceCode !== provinceCode) return false;
      return a.nextRevisitDueDate != null && a.nextRevisitDueDate <= asOfDate;
    });
  }

  async getAlreadyVisitedNotDue(
    asOfDate: string,
    provinceCode?: string,
  ): Promise<CrmInternalAccount[]> {
    return (await this.loadAll()).filter((a) => {
      if (a.doNotContact && a.dncVerified) return false;
      if (provinceCode && a.provinceCode !== provinceCode) return false;
      if (!a.lastVisitDate || !a.nextRevisitDueDate) return false;
      return a.nextRevisitDueDate > asOfDate;
    });
  }
}
