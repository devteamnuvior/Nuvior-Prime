/**
 * Surface conflicts between CRM assignedRep and app AccountAssignment.
 */

import { prisma } from "@/lib/prisma";

export type OwnershipConflict = {
  crmExternalId: string;
  placeId: string | null;
  crmAssignedRep: string;
  appAssignees: { userId: string; email: string; displayName: string }[];
};

export async function listOwnershipConflicts(): Promise<OwnershipConflict[]> {
  const crmRows = await prisma.canonicalCrmAccount.findMany({
    where: { assignedRep: { not: null } },
  });
  const conflicts: OwnershipConflict[] = [];

  for (const row of crmRows) {
    const rep = row.assignedRep!.trim().toLowerCase();
    if (!row.placeId) continue;

    const accounts = await prisma.account.findMany({
      where: { placeId: row.placeId },
      include: {
        assignments: {
          where: { activeTo: null },
          include: { user: true },
        },
      },
    });

    for (const acct of accounts) {
      const assignees = acct.assignments.map((a) => ({
        userId: a.user.id,
        email: a.user.email,
        displayName: a.user.displayName,
      }));
      if (assignees.length === 0) continue;
      const emails = new Set(assignees.map((a) => a.email.toLowerCase()));
      if (!emails.has(rep)) {
        conflicts.push({
          crmExternalId: row.crmExternalId,
          placeId: row.placeId,
          crmAssignedRep: row.assignedRep!,
          appAssignees: assignees,
        });
      }
    }
  }

  return conflicts;
}
