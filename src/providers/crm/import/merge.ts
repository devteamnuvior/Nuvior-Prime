/**
 * Merge normalized partials by source precedence into canonical accounts.
 */

import { SOURCE_PRECEDENCE, type CrmSourceKind } from "./types";
import type { NormalizedPartial } from "./normalize";
import type { CertificationPathwayCode } from "@/domain/terminology";

export type MergedCanonical = {
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
  lastOrderDate: string | null;
  doNotContact: boolean | null;
  dncVerified: boolean;
  lastVisitDate: string | null;
  nextRevisitDueDate: string | null;
  visitNotes: string | null;
  historicalProductInterest: string | null;
  provenance: Record<string, { source: string; at: string }>;
};

type Slot = { value: unknown; precedence: number; source: string };

function setField(
  slots: Record<string, Slot>,
  field: string,
  value: unknown,
  source: CrmSourceKind,
  at: string,
) {
  if (value === undefined) return;
  const prec = SOURCE_PRECEDENCE[source];
  const cur = slots[field];
  if (!cur || prec >= cur.precedence) {
    slots[field] = { value, precedence: prec, source, };
  }
  void at;
}

export function mergePartials(
  partials: NormalizedPartial[],
  importedAt = new Date().toISOString(),
): { accounts: MergedCanonical[]; rejected: NormalizedPartial[] } {
  const byId = new Map<string, NormalizedPartial[]>();
  const rejected: NormalizedPartial[] = [];

  for (const p of partials) {
    if (p.parseErrors.length || !p.crmExternalId) {
      rejected.push(p);
      continue;
    }
    const list = byId.get(p.crmExternalId) ?? [];
    list.push(p);
    byId.set(p.crmExternalId, list);
  }

  const accounts: MergedCanonical[] = [];

  for (const [id, list] of byId) {
    const slots: Record<string, Slot> = {};
    const provenance: MergedCanonical["provenance"] = {};

    for (const p of list) {
      const src = p.source as CrmSourceKind;
      const apply = (field: keyof NormalizedPartial, value: unknown) => {
        if (value === undefined) return;
        const before = slots[field as string];
        setField(slots, field as string, value, src, importedAt);
        if (!before || SOURCE_PRECEDENCE[src] >= before.precedence) {
          provenance[field as string] = { source: src, at: importedAt };
        }
      };

      apply("businessName", p.businessName);
      apply("streetAddress", p.streetAddress);
      apply("city", p.city);
      apply("provinceCode", p.provinceCode);
      apply("postalCode", p.postalCode);
      apply("phone", p.phone);
      apply("email", p.email);
      apply("placeId", p.placeId);
      apply("websiteDomain", p.websiteDomain);
      apply("assignedRep", p.assignedRep);
      apply("internalStatus", p.internalStatus);
      apply("hasAcademyAccount", p.hasAcademyAccount);
      apply("aptosCertificationLevel", p.aptosCertificationLevel);
      apply("aptosPathway", p.aptosPathway);
      apply("staffEligibleFor4Level", p.staffEligibleFor4Level);
      apply("formerMesoesteticCustomer", p.formerMesoesteticCustomer);
      apply("mesoesteticRetentionFlag", p.mesoesteticRetentionFlag);
      apply("lastOrderDate", p.lastOrderDate);
      apply("doNotContact", p.doNotContact);
      apply("dncVerified", p.dncVerified);
      apply("lastVisitDate", p.lastVisitDate);
      apply("nextRevisitDueDate", p.nextRevisitDueDate);
      apply("visitNotes", p.visitNotes);
      apply("historicalProductInterest", p.historicalProductInterest);
    }

    const name = slots.businessName?.value as string | undefined;
    if (!name) {
      rejected.push({
        crmExternalId: id,
        parseErrors: ["missing businessName after merge"],
        source: "accounts",
      });
      continue;
    }

    accounts.push({
      crmExternalId: id,
      businessName: name,
      streetAddress: (slots.streetAddress?.value as string | null) ?? null,
      city: (slots.city?.value as string | null) ?? null,
      provinceCode: (slots.provinceCode?.value as string | null) ?? null,
      postalCode: (slots.postalCode?.value as string | null) ?? null,
      phone: (slots.phone?.value as string | null) ?? null,
      email: (slots.email?.value as string | null) ?? null,
      placeId: (slots.placeId?.value as string | null) ?? null,
      websiteDomain: (slots.websiteDomain?.value as string | null) ?? null,
      assignedRep: (slots.assignedRep?.value as string | null) ?? null,
      internalStatus: (slots.internalStatus?.value as string | null) ?? null,
      hasAcademyAccount: (slots.hasAcademyAccount?.value as boolean | null) ?? null,
      aptosCertificationLevel:
        (slots.aptosCertificationLevel?.value as string | null) ?? null,
      aptosPathway: (slots.aptosPathway?.value as CertificationPathwayCode) ?? "NONE",
      staffEligibleFor4Level:
        (slots.staffEligibleFor4Level?.value as string | null) ?? null,
      formerMesoesteticCustomer: Boolean(slots.formerMesoesteticCustomer?.value),
      mesoesteticRetentionFlag: Boolean(slots.mesoesteticRetentionFlag?.value),
      lastOrderDate: (slots.lastOrderDate?.value as string | null) ?? null,
      doNotContact:
        slots.doNotContact?.value === undefined
          ? null
          : (slots.doNotContact.value as boolean | null),
      dncVerified: Boolean(slots.dncVerified?.value),
      lastVisitDate: (slots.lastVisitDate?.value as string | null) ?? null,
      nextRevisitDueDate: (slots.nextRevisitDueDate?.value as string | null) ?? null,
      visitNotes: (slots.visitNotes?.value as string | null) ?? null,
      historicalProductInterest:
        (slots.historicalProductInterest?.value as string | null) ?? null,
      provenance,
    });
  }

  return { accounts, rejected };
}
