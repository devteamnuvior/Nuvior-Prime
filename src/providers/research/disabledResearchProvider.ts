import type { ClinicResearchContext } from "@/domain/research/clinicResearchContext";
import type { ResearchProvider, ResearchExtractionResult } from "./types";

export class DisabledResearchProvider implements ResearchProvider {
  readonly name = "disabled";

  constructor(private reason = "AI_RESEARCH_PROVIDER=disabled") {}

  isEnabled(): boolean {
    return false;
  }

  getUnavailableReason(): string | null {
    return this.reason;
  }

  async extract(context: ClinicResearchContext): Promise<ResearchExtractionResult> {
    void context;
    return { ok: false, provider: this.name, error: this.reason, cacheHit: false };
  }
}
