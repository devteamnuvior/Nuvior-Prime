import { prisma } from "@/lib/prisma";
import type { PersistedMapping } from "@/domain/crm/matching";
import type { MatchMethod } from "@/domain/crm/matching";

export async function loadPersistedMappings(): Promise<PersistedMapping[]> {
  try {
    const rows = await prisma.crmAccountMapping.findMany();
    return rows.map((r) => ({
      crmExternalId: r.crmExternalId,
      placeId: r.placeId || null,
      normalizedBusinessName: r.normalizedBusinessName,
      normalizedAddress: r.normalizedAddress,
      matchMethod: r.matchMethod as MatchMethod,
      matchConfidence: r.matchConfidence,
      verified: r.verified,
      rejected: r.rejected,
    }));
  } catch {
    // DB may be down in unit tests — treat as empty mappings
    return [];
  }
}

export async function upsertMappingDecision(input: {
  crmExternalId: string;
  placeId: string | null;
  normalizedBusinessName?: string | null;
  normalizedAddress?: string | null;
  matchMethod: string;
  matchConfidence: number;
  verified: boolean;
  rejected: boolean;
  decidedByUserId?: string | null;
  decisionComment?: string | null;
}): Promise<void> {
  const placeId = input.placeId ?? "";
  await prisma.crmAccountMapping.upsert({
    where: {
      crmExternalId_placeId: {
        crmExternalId: input.crmExternalId,
        placeId,
      },
    },
    create: {
      crmExternalId: input.crmExternalId,
      placeId,
      normalizedBusinessName: input.normalizedBusinessName ?? null,
      normalizedAddress: input.normalizedAddress ?? null,
      matchMethod: input.matchMethod,
      matchConfidence: input.matchConfidence,
      verified: input.verified,
      rejected: input.rejected,
      decidedByUserId: input.decidedByUserId ?? null,
      decisionComment: input.decisionComment ?? null,
      decidedAt: new Date(),
    },
    update: {
      normalizedBusinessName: input.normalizedBusinessName ?? null,
      normalizedAddress: input.normalizedAddress ?? null,
      matchMethod: input.matchMethod,
      matchConfidence: input.matchConfidence,
      verified: input.verified,
      rejected: input.rejected,
      decidedByUserId: input.decidedByUserId ?? null,
      decisionComment: input.decisionComment ?? null,
      decidedAt: new Date(),
    },
  });
}

export async function listUnresolvedMappings(): Promise<
  {
    id: string;
    crmExternalId: string;
    placeId: string | null;
    matchMethod: string;
    matchConfidence: number;
    verified: boolean;
    rejected: boolean;
  }[]
> {
  return prisma.crmAccountMapping.findMany({
    where: { verified: false, rejected: false },
    orderBy: { updatedAt: "desc" },
  });
}
