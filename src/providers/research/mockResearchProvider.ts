import type { ClinicResearchContext } from "@/domain/research/clinicResearchContext";
import { validateResearchExtraction } from "@/domain/research/schemas";
import type { ResearchProvider, ResearchExtractionResult } from "./types";
import { MOCK_RESEARCH_FIXTURES, resolveMockFixture } from "./mockResearchFixtures";

export class MockResearchProvider implements ResearchProvider {
  readonly name = "mock";
  private unavailable: boolean;
  private reason: string | null;
  private simulateTimeout: boolean;

  constructor(opts?: { unavailable?: boolean; reason?: string; simulateTimeout?: boolean }) {
    this.unavailable = opts?.unavailable ?? false;
    this.reason = opts?.reason ?? null;
    this.simulateTimeout = opts?.simulateTimeout ?? false;
  }

  isEnabled(): boolean {
    return !this.unavailable;
  }

  getUnavailableReason(): string | null {
    return this.unavailable ? (this.reason ?? "Mock research unavailable") : null;
  }

  async extract(context: ClinicResearchContext): Promise<ResearchExtractionResult> {
    if (this.unavailable) {
      return { ok: false, provider: this.name, error: this.reason ?? "unavailable", cacheHit: false };
    }
    if (this.simulateTimeout) {
      return { ok: false, provider: this.name, error: "Mock timeout", cacheHit: false };
    }

    const started = Date.now();
    const raw = resolveMockFixture(context.clinicId);
    const validated = validateResearchExtraction(raw);
    if (!validated.ok) {
      return { ok: false, provider: this.name, error: validated.errors.join("; "), cacheHit: false };
    }

    return {
      ok: true,
      payload: validated.value,
      provider: this.name,
      model: "mock-deterministic",
      cacheHit: false,
      latencyMs: Date.now() - started,
    };
  }

  /** Expose fixture ids for validation script. */
  static fixtureIds(): string[] {
    return Object.keys(MOCK_RESEARCH_FIXTURES);
  }
}
