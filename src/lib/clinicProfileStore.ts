import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CLINIC_PROFILE_PROMPT_VERSION, validateClinicWebProfile, type ClinicWebProfile } from "@/domain/clinicProfile/schema";

export type StoredClinicWebProfile = {
  clinicId: string;
  provider: string;
  model: string | null;
  promptVersion: string;
  profile: ClinicWebProfile;
  researchedAt: Date;
};

export async function getStoredClinicWebProfile(clinicId: string): Promise<StoredClinicWebProfile | null> {
  const row = await prisma.clinicWebProfile.findUnique({ where: { clinicId } });
  if (!row) return null;
  const validated = validateClinicWebProfile(row.profileJson);
  if (!validated.ok) return null; // schema drift — treat as missing, caller may refresh
  return {
    clinicId: row.clinicId,
    provider: row.provider,
    model: row.model,
    promptVersion: row.promptVersion,
    profile: validated.value,
    researchedAt: row.researchedAt,
  };
}

export async function saveClinicWebProfile(input: {
  clinicId: string;
  provider: string;
  model: string | null;
  profile: ClinicWebProfile;
}): Promise<StoredClinicWebProfile> {
  const profileJson = input.profile as unknown as Prisma.InputJsonValue;
  const row = await prisma.clinicWebProfile.upsert({
    where: { clinicId: input.clinicId },
    create: {
      clinicId: input.clinicId,
      provider: input.provider,
      model: input.model,
      promptVersion: CLINIC_PROFILE_PROMPT_VERSION,
      profileJson,
      researchedAt: new Date(),
    },
    update: {
      provider: input.provider,
      model: input.model,
      promptVersion: CLINIC_PROFILE_PROMPT_VERSION,
      profileJson,
      researchedAt: new Date(),
    },
  });
  return {
    clinicId: row.clinicId,
    provider: row.provider,
    model: row.model,
    promptVersion: row.promptVersion,
    profile: input.profile,
    researchedAt: row.researchedAt,
  };
}

export function isClinicWebProfileStale(stored: StoredClinicWebProfile, ttlSeconds: number): boolean {
  if (stored.promptVersion !== CLINIC_PROFILE_PROMPT_VERSION) return true;
  return Date.now() - stored.researchedAt.getTime() > ttlSeconds * 1000;
}
