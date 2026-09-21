import type { ClinicResearchContext } from "@/domain/research/clinicResearchContext";
import type { ResearchExtractionPayload } from "@/domain/research/schemas";

export type ResearchExtractionResult =
  | {
      ok: true;
      payload: ResearchExtractionPayload;
      provider: string;
      model: string | null;
      cacheHit: boolean;
      latencyMs: number;
    }
  | {
      ok: false;
      provider: string;
      error: string;
      cacheHit: boolean;
    };

/**
 * Pluggable clinic research extraction — separate from narrative LLM provider.
 * Must not choose NUVIOR product recommendations.
 */
export interface ResearchProvider {
  readonly name: string;
  isEnabled(): boolean;
  getUnavailableReason(): string | null;
  extract(context: ClinicResearchContext): Promise<ResearchExtractionResult>;
}
