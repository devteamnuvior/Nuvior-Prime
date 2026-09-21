/**
 * Import orchestration: parse → stage → merge → write canonical (or dry-run).
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { CrmSourceKind } from "./types";
import { parseSourceFile } from "./parse";
import { mergePartials } from "./merge";
import { mergedToCrmAccount } from "./toCrmAccount";
import type { NormalizedPartial } from "./normalize";
import type { MergedCanonical } from "./merge";

export type ImportFileInput = {
  source: CrmSourceKind;
  content: string;
  format: "json" | "csv";
  fileName?: string;
};

export type ImportReport = {
  dryRun: boolean;
  recordsRead: number;
  validPartials: number;
  invalidPartials: number;
  parseErrors: { source: string; index: number; message: string }[];
  rejected: NormalizedPartial[];
  newCanonicalCount: number;
  updatedCanonicalCount: number;
  accountsPreview: { crmExternalId: string; businessName: string; dncVerified: boolean }[];
  ambiguousNote: string;
  wrote: boolean;
};

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 32);
}

export async function runCrmImport(
  files: ImportFileInput[],
  options: { dryRun?: boolean } = {},
): Promise<ImportReport> {
  const dryRun = options.dryRun === true;
  const allPartials: NormalizedPartial[] = [];
  const parseErrors: ImportReport["parseErrors"] = [];
  let recordsRead = 0;

  for (const file of files) {
    const parsed = parseSourceFile(file.source, file.content, file.format);
    recordsRead += parsed.recordsRead;
    parseErrors.push(...parsed.parseErrors);
    allPartials.push(...parsed.partials);

    if (!dryRun) {
      for (const p of parsed.partials) {
        if (!p.crmExternalId) continue;
        const payload = { ...p };
        await prisma.crmSourceRecord.upsert({
          where: {
            source_sourceRecordId: {
              source: file.source,
              sourceRecordId: `${p.crmExternalId}`,
            },
          },
          create: {
            source: file.source,
            sourceRecordId: p.crmExternalId,
            rawHash: hashPayload(payload),
            payloadJson: payload,
            normalizedStatus: p.parseErrors.length ? "error" : "normalized",
            parseErrors: p.parseErrors,
          },
          update: {
            rawHash: hashPayload(payload),
            payloadJson: payload,
            normalizedStatus: p.parseErrors.length ? "error" : "normalized",
            parseErrors: p.parseErrors,
            fetchedAt: new Date(),
          },
        });
      }
    }
  }

  const { accounts, rejected } = mergePartials(allPartials);
  const invalidPartials = allPartials.filter((p) => p.parseErrors.length > 0).length;
  const validPartials = allPartials.length - invalidPartials;

  let newCanonicalCount = 0;
  let updatedCanonicalCount = 0;

  if (!dryRun) {
    for (const a of accounts) {
      const existing = await prisma.canonicalCrmAccount.findUnique({
        where: { crmExternalId: a.crmExternalId },
      });
      const data = mergedToDb(a);
      if (existing) {
        await prisma.canonicalCrmAccount.update({
          where: { crmExternalId: a.crmExternalId },
          data,
        });
        updatedCanonicalCount++;
      } else {
        await prisma.canonicalCrmAccount.create({ data });
        newCanonicalCount++;
      }
      await prisma.crmSourceRecord.updateMany({
        where: { sourceRecordId: a.crmExternalId },
        data: {
          canonicalAccountId: a.crmExternalId,
          normalizedStatus: "merged",
        },
      });
    }
  } else {
    newCanonicalCount = accounts.length;
    updatedCanonicalCount = 0;
  }

  return {
    dryRun,
    recordsRead,
    validPartials,
    invalidPartials: invalidPartials + rejected.length,
    parseErrors,
    rejected,
    newCanonicalCount,
    updatedCanonicalCount,
    accountsPreview: accounts.slice(0, 50).map((a) => ({
      crmExternalId: a.crmExternalId,
      businessName: a.businessName,
      dncVerified: a.dncVerified && a.doNotContact !== null,
    })),
    ambiguousNote:
      "Import does not auto-merge public↔CRM mappings; use matching queue / backfill dry-run.",
    wrote: !dryRun,
  };
}

function mergedToDb(a: MergedCanonical) {
  return {
    crmExternalId: a.crmExternalId,
    businessName: a.businessName,
    streetAddress: a.streetAddress,
    city: a.city,
    provinceCode: a.provinceCode,
    postalCode: a.postalCode,
    phone: a.phone,
    email: a.email,
    placeId: a.placeId,
    websiteDomain: a.websiteDomain,
    assignedRep: a.assignedRep,
    internalStatus: a.internalStatus,
    hasAcademyAccount: a.hasAcademyAccount,
    aptosCertificationLevel: a.aptosCertificationLevel,
    aptosPathway: a.aptosPathway,
    staffEligibleFor4Level: a.staffEligibleFor4Level,
    formerMesoesteticCustomer: a.formerMesoesteticCustomer,
    mesoesteticRetentionFlag: a.mesoesteticRetentionFlag,
    lastOrderDate: a.lastOrderDate ? new Date(a.lastOrderDate) : null,
    doNotContact: a.doNotContact,
    dncVerified: a.dncVerified && a.doNotContact !== null,
    lastVisitDate: a.lastVisitDate ? new Date(a.lastVisitDate) : null,
    nextRevisitDueDate: a.nextRevisitDueDate ? new Date(a.nextRevisitDueDate) : null,
    visitNotes: a.visitNotes,
    historicalProductInterest: a.historicalProductInterest,
    sourceProvenance: a.provenance,
    importedAt: new Date(),
  };
}

/** Pure merge helper for tests without DB. */
export function dryMergeFromPartials(partials: NormalizedPartial[]) {
  const { accounts, rejected } = mergePartials(partials);
  return {
    accounts: accounts.map(mergedToCrmAccount),
    rejected,
    merged: accounts,
  };
}
