import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getResearchConfig } from "@/lib/researchConfig";
import type { ClinicCapabilityProfile } from "@/domain/research/clinicCapabilityProfile";

export function researchCacheKey(clinicId: string, sourceVersion: string, promptVersion: string): string {
  return createHash("sha256")
    .update(["clinic-research", clinicId, sourceVersion, promptVersion].join("|"))
    .digest("hex");
}

export async function getPersistedResearchProfile(
  clinicId: string,
  sourceVersion: string,
  promptVersion: string,
): Promise<ClinicCapabilityProfile | null> {
  try {
    const row = await prisma.clinicResearchProfile.findUnique({ where: { clinicId } });
    if (!row) return null;
    if (row.sourceVersion !== sourceVersion || row.promptVersion !== promptVersion) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
    return row.profileJson as unknown as ClinicCapabilityProfile;
  } catch {
    return null;
  }
}

export async function persistResearchProfile(
  profile: ClinicCapabilityProfile,
  sourcePageHashes: string[],
): Promise<void> {
  const ttl = getResearchConfig().cacheTtlSeconds;
  const expiresAt = new Date(Date.now() + ttl * 1000);
  try {
    await prisma.clinicResearchProfile.upsert({
      where: { clinicId: profile.clinicId },
      create: {
        clinicId: profile.clinicId,
        researchStatus: profile.researchStatus,
        provider: profile.provider,
        model: profile.model,
        promptVersion: profile.promptVersion,
        sourceVersion: profile.sourceVersion,
        sourcePageHashes,
        profileJson: profile as object,
        researchedAt: new Date(profile.researchedAt),
        expiresAt,
      },
      update: {
        researchStatus: profile.researchStatus,
        provider: profile.provider,
        model: profile.model,
        promptVersion: profile.promptVersion,
        sourceVersion: profile.sourceVersion,
        sourcePageHashes,
        profileJson: profile as object,
        researchedAt: new Date(profile.researchedAt),
        expiresAt,
      },
    });
  } catch {
    // Persistence is best-effort when DB unavailable (tests/local)
  }
}

export async function getResearchProfileByClinicId(
  clinicId: string,
): Promise<ClinicCapabilityProfile | null> {
  try {
    const row = await prisma.clinicResearchProfile.findUnique({ where: { clinicId } });
    if (!row) return null;
    return row.profileJson as unknown as ClinicCapabilityProfile;
  } catch {
    return null;
  }
}

export function isResearchProfileStale(
  profile: ClinicCapabilityProfile,
  currentSourceVersion: string,
  promptVersion: string,
): boolean {
  return (
    profile.sourceVersion !== currentSourceVersion || profile.promptVersion !== promptVersion
  );
}
