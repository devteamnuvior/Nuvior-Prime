import type { ClinicProfileRequest } from "./prompts";
import type { ClinicWebProfile } from "./schema";
import type { ClinicProfileProvider } from "@/providers/clinicProfile/types";
import {
  getStoredClinicWebProfile,
  isClinicWebProfileStale,
  saveClinicWebProfile,
} from "@/lib/clinicProfileStore";

export type ClinicWebProfileState = "NOT_RESEARCHED" | "READY" | "STALE" | "FAILED" | "UNAVAILABLE";

/** Serializable view for the client. Dates are ISO strings. */
export type ClinicWebProfileDto = {
  clinicId: string;
  state: ClinicWebProfileState;
  profile: ClinicWebProfile | null;
  provider: string | null;
  model: string | null;
  researchedAt: string | null;
  failureMessage: string | null;
  searchesUsed: number | null;
};

export function emptyClinicWebProfileDto(clinicId: string): ClinicWebProfileDto {
  return {
    clinicId,
    state: "NOT_RESEARCHED",
    profile: null,
    provider: null,
    model: null,
    researchedAt: null,
    failureMessage: null,
    searchesUsed: null,
  };
}

/** Cached view only — never calls the provider. */
export async function getCachedClinicWebProfile(
  clinicId: string,
  cacheTtlSeconds: number,
): Promise<ClinicWebProfileDto> {
  const stored = await getStoredClinicWebProfile(clinicId);
  if (!stored) return emptyClinicWebProfileDto(clinicId);
  return {
    clinicId,
    state: isClinicWebProfileStale(stored, cacheTtlSeconds) ? "STALE" : "READY",
    profile: stored.profile,
    provider: stored.provider,
    model: stored.model,
    researchedAt: stored.researchedAt.toISOString(),
    failureMessage: null,
    searchesUsed: null,
  };
}

/** Runs the provider and persists the result. */
export async function runClinicWebProfileResearch(
  provider: ClinicProfileProvider,
  request: ClinicProfileRequest,
): Promise<ClinicWebProfileDto> {
  if (!provider.isEnabled()) {
    return {
      ...emptyClinicWebProfileDto(request.clinicId),
      state: "UNAVAILABLE",
      provider: provider.name,
      failureMessage: provider.getUnavailableReason() ?? "Clinic research unavailable",
    };
  }

  const result = await provider.research(request);
  if (!result.ok) {
    return {
      ...emptyClinicWebProfileDto(request.clinicId),
      state: "FAILED",
      provider: result.provider,
      failureMessage: result.error,
    };
  }

  const stored = await saveClinicWebProfile({
    clinicId: request.clinicId,
    provider: result.provider,
    model: result.model,
    profile: result.profile,
  });

  return {
    clinicId: request.clinicId,
    state: "READY",
    profile: stored.profile,
    provider: stored.provider,
    model: stored.model,
    researchedAt: stored.researchedAt.toISOString(),
    failureMessage: null,
    searchesUsed: result.searchesUsed,
  };
}
