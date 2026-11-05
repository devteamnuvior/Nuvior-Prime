import type { ClinicProfileRequest } from "./prompts";
import type { ClinicWebProfile } from "./schema";
import type { ClinicProfileProvider } from "@/providers/clinicProfile/types";
import { getStoredClinicWebProfile, saveClinicWebProfile, type StoredClinicWebProfile } from "@/lib/clinicProfileStore";

/**
 * A clinic is researched once. The stored profile is shared by every user and
 * is never re-requested from Claude; there is no "stale" state.
 */
export type ClinicWebProfileState = "NOT_RESEARCHED" | "READY" | "FAILED" | "UNAVAILABLE";

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

function readyDto(clinicId: string, stored: StoredClinicWebProfile, searchesUsed: number | null): ClinicWebProfileDto {
  return {
    clinicId,
    state: "READY",
    profile: stored.profile,
    provider: stored.provider,
    model: stored.model,
    researchedAt: stored.researchedAt.toISOString(),
    failureMessage: null,
    searchesUsed,
  };
}

/** Stored view only — never calls the provider. */
export async function getCachedClinicWebProfile(clinicId: string): Promise<ClinicWebProfileDto> {
  const stored = await getStoredClinicWebProfile(clinicId);
  if (!stored) return emptyClinicWebProfileDto(clinicId);
  return readyDto(clinicId, stored, null);
}

/**
 * Runs the provider once per clinic and persists the result. A clinic that
 * already has a stored profile is returned as-is: no second request to Claude,
 * whoever asks.
 */
export async function runClinicWebProfileResearch(
  provider: ClinicProfileProvider,
  request: ClinicProfileRequest,
): Promise<ClinicWebProfileDto> {
  const existing = await getStoredClinicWebProfile(request.clinicId);
  if (existing) return readyDto(request.clinicId, existing, 0);

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
  return readyDto(request.clinicId, stored, result.searchesUsed);
}
