/**
 * Controlled CRM mapping backfill from Place ID on canonical import mirror.
 * Dry-run by default unless --apply.
 */

import { prisma } from "@/lib/prisma";
import { writeAuditEvent } from "@/lib/audit";

export type BackfillProposal = {
  crmExternalId: string;
  placeId: string;
  action: "create" | "skip_verified" | "skip_rejected" | "conflict";
  detail: string;
};

export type BackfillReport = {
  dryRun: boolean;
  proposals: BackfillProposal[];
  applied: number;
};

export async function runMappingBackfill(options: {
  dryRun: boolean;
  actorUserId?: string | null;
  overrideVerified?: boolean;
}): Promise<BackfillReport> {
  const dryRun = options.dryRun !== false;
  const rows = await prisma.canonicalCrmAccount.findMany({
    where: { placeId: { not: null } },
  });

  const proposals: BackfillProposal[] = [];
  let applied = 0;

  for (const row of rows) {
    const placeId = row.placeId!;
    const existing = await prisma.crmAccountMapping.findUnique({
      where: {
        crmExternalId_placeId: {
          crmExternalId: row.crmExternalId,
          placeId,
        },
      },
    });

    if (existing?.verified && !options.overrideVerified) {
      proposals.push({
        crmExternalId: row.crmExternalId,
        placeId,
        action: "skip_verified",
        detail: "Preserving manually verified mapping",
      });
      continue;
    }

    if (existing?.rejected) {
      proposals.push({
        crmExternalId: row.crmExternalId,
        placeId,
        action: "skip_rejected",
        detail: "Rejected mapping not auto-revived",
      });
      continue;
    }

    // Conflict: another CRM id already verified for this place
    const other = await prisma.crmAccountMapping.findFirst({
      where: {
        placeId,
        verified: true,
        rejected: false,
        NOT: { crmExternalId: row.crmExternalId },
      },
    });
    if (other) {
      proposals.push({
        crmExternalId: row.crmExternalId,
        placeId,
        action: "conflict",
        detail: `Place already verified to ${other.crmExternalId}`,
      });
      continue;
    }

    proposals.push({
      crmExternalId: row.crmExternalId,
      placeId,
      action: "create",
      detail: "Propose verified Place ID mapping from import",
    });

    if (!dryRun) {
      await prisma.crmAccountMapping.upsert({
        where: {
          crmExternalId_placeId: {
            crmExternalId: row.crmExternalId,
            placeId,
          },
        },
        create: {
          crmExternalId: row.crmExternalId,
          placeId,
          matchMethod: "exact_place_id_backfill",
          matchConfidence: 1,
          verified: true,
          rejected: false,
          decidedByUserId: options.actorUserId ?? null,
          decisionComment: "Phase 7 import Place ID backfill",
          decidedAt: new Date(),
        },
        update: {
          matchMethod: "exact_place_id_backfill",
          matchConfidence: 1,
          verified: true,
          rejected: false,
          decidedByUserId: options.actorUserId ?? null,
          decisionComment: "Phase 7 import Place ID backfill",
          decidedAt: new Date(),
        },
      });
      applied++;
      await writeAuditEvent({
        actor: null,
        action: "crm.mapping.backfill",
        resourceType: "CrmAccountMapping",
        resourceId: `${row.crmExternalId}:${placeId}`,
        metadata: {
          crmExternalId: maskId(row.crmExternalId),
          placeId: maskId(placeId),
          actorUserId: options.actorUserId ?? null,
        },
      });
    }
  }

  return { dryRun, proposals, applied };
}

function maskId(id: string): string {
  if (id.length <= 6) return "***";
  return `${id.slice(0, 4)}…${id.slice(-2)}`;
}
