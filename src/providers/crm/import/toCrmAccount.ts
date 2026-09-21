/**
 * Map MergedCanonical / DB row → CrmInternalAccount (domain contract).
 */

import type { CrmInternalAccount } from "../types";
import type { MergedCanonical } from "./merge";
import type { CertificationPathwayCode } from "@/domain/terminology";
import type { CanonicalCrmAccount } from "@prisma/client";

const emptyCredentials = {
  hasPhysicianOrNp: false,
  hasRn: false,
  hasNd: false,
  hasImg: false,
  hasAllied: false,
  physicianOrNpOnSiteForPrp: false,
  rnHasPhysicianDirective: false,
};

export function mergedToCrmAccount(m: MergedCanonical): CrmInternalAccount {
  return {
    crmExternalId: m.crmExternalId,
    businessName: m.businessName,
    streetAddress: m.streetAddress,
    city: m.city,
    provinceCode: m.provinceCode,
    postalCode: m.postalCode,
    phone: m.phone,
    email: m.email,
    placeId: m.placeId,
    websiteDomain: m.websiteDomain,
    assignedRep: m.assignedRep,
    internalStatus: m.internalStatus,
    hasAcademyAccount: m.hasAcademyAccount,
    aptosCertificationLevel: m.aptosCertificationLevel,
    aptosPathway: m.aptosPathway,
    staffEligibleFor4Level: m.staffEligibleFor4Level,
    formerMesoesteticCustomer: m.formerMesoesteticCustomer,
    mesoesteticRetentionFlag: m.mesoesteticRetentionFlag,
    lastOrderDate: m.lastOrderDate,
    doNotContact: m.doNotContact === true,
    dncVerified: m.dncVerified && m.doNotContact !== null,
    lastVisitDate: m.lastVisitDate,
    nextRevisitDueDate: m.nextRevisitDueDate,
    visitNotes: m.visitNotes,
    historicalProductInterest: m.historicalProductInterest,
    credentials: emptyCredentials,
  };
}

function dateIso(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function dbRowToCrmAccount(row: CanonicalCrmAccount): CrmInternalAccount {
  const creds =
    row.credentialsJson && typeof row.credentialsJson === "object"
      ? { ...emptyCredentials, ...(row.credentialsJson as object) }
      : emptyCredentials;

  return {
    crmExternalId: row.crmExternalId,
    businessName: row.businessName,
    streetAddress: row.streetAddress,
    city: row.city,
    provinceCode: row.provinceCode,
    postalCode: row.postalCode,
    phone: row.phone,
    email: row.email,
    placeId: row.placeId,
    websiteDomain: row.websiteDomain,
    assignedRep: row.assignedRep,
    internalStatus: row.internalStatus,
    hasAcademyAccount: row.hasAcademyAccount,
    aptosCertificationLevel: row.aptosCertificationLevel,
    aptosPathway: (row.aptosPathway as CertificationPathwayCode) || "NONE",
    staffEligibleFor4Level: row.staffEligibleFor4Level,
    formerMesoesteticCustomer: row.formerMesoesteticCustomer,
    mesoesteticRetentionFlag: row.mesoesteticRetentionFlag,
    lastOrderDate: dateIso(row.lastOrderDate),
    doNotContact: row.doNotContact === true,
    dncVerified: row.dncVerified && row.doNotContact !== null,
    lastVisitDate: dateIso(row.lastVisitDate),
    nextRevisitDueDate: dateIso(row.nextRevisitDueDate),
    visitNotes: row.visitNotes,
    historicalProductInterest: row.historicalProductInterest,
    credentials: creds as CrmInternalAccount["credentials"],
  };
}
