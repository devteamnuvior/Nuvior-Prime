import type { ClinicProfileRequest } from "@/domain/clinicProfile/prompts";
import type { ClinicWebProfile } from "@/domain/clinicProfile/schema";

export type ClinicProfileResult =
  | {
      ok: true;
      profile: ClinicWebProfile;
      provider: string;
      model: string | null;
      latencyMs: number;
      searchesUsed: number;
    }
  | {
      ok: false;
      provider: string;
      error: string;
    };

/**
 * Pluggable clinic contact/identity research. Public web facts only —
 * never product recommendations, qualification, or CRM/DNC decisions.
 */
export interface ClinicProfileProvider {
  readonly name: string;
  isEnabled(): boolean;
  getUnavailableReason(): string | null;
  research(request: ClinicProfileRequest): Promise<ClinicProfileResult>;
}
