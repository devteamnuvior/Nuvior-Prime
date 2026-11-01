import { getClinicProfileConfig } from "@/lib/clinicProfileConfig";
import { ClaudeClinicProfileProvider } from "./claudeClinicProfileProvider";
import { MockClinicProfileProvider } from "./mockClinicProfileProvider";
import type { ClinicProfileProvider, ClinicProfileResult } from "./types";

let singleton: ClinicProfileProvider | null = null;

class DisabledClinicProfileProvider implements ClinicProfileProvider {
  readonly name = "disabled";
  isEnabled(): boolean {
    return false;
  }
  getUnavailableReason(): string | null {
    return "Clinic profile research is disabled (CLINIC_PROFILE_PROVIDER=disabled)";
  }
  async research(): Promise<ClinicProfileResult> {
    return { ok: false, provider: this.name, error: this.getUnavailableReason() ?? "disabled" };
  }
}

/** Server-side factory. Never silently falls back from claude to mock. */
export function getClinicProfileProvider(): ClinicProfileProvider {
  if (singleton) return singleton;
  const cfg = getClinicProfileConfig();

  if (cfg.provider === "mock") {
    singleton = new MockClinicProfileProvider();
  } else if (cfg.provider === "claude") {
    singleton = new ClaudeClinicProfileProvider({
      model: cfg.model,
      timeoutMs: cfg.timeoutMs,
      maxSearches: cfg.maxSearches,
      maxFetches: cfg.maxFetches,
    });
  } else {
    singleton = new DisabledClinicProfileProvider();
  }
  return singleton;
}

export function resetClinicProfileProviderForTests(): void {
  singleton = null;
}

export type { ClinicProfileProvider, ClinicProfileResult } from "./types";
