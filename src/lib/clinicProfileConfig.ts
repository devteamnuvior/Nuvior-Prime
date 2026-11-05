/**
 * Server-side configuration for clinic web-profile research (Claude).
 * Shares ANTHROPIC_API_KEY / CLAUDE_MODEL with Stage C clinic research.
 */

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";

export type ClinicProfileProviderMode = "claude" | "mock" | "disabled";

export type ClinicProfileConfig = {
  provider: ClinicProfileProviderMode;
  model: string;
  timeoutMs: number;
  maxSearches: number;
  maxFetches: number;
  hasAnthropicKey: boolean;
};

export function getClinicProfileConfig(): ClinicProfileConfig {
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const raw = (process.env.CLINIC_PROFILE_PROVIDER ?? "").toLowerCase();

  // Unset → claude when a key is present, otherwise mock. Explicit values win.
  const provider: ClinicProfileProviderMode =
    raw === "claude" || raw === "mock" || raw === "disabled"
      ? raw
      : raw === ""
        ? hasAnthropicKey
          ? "claude"
          : "mock"
        : "disabled";

  return {
    provider,
    model: process.env.CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL,
    timeoutMs: Number(process.env.CLINIC_PROFILE_TIMEOUT_MS ?? "180000") || 180000,
    maxSearches: Number(process.env.CLINIC_PROFILE_MAX_SEARCHES ?? "8") || 8,
    maxFetches: Number(process.env.CLINIC_PROFILE_MAX_FETCHES ?? "6") || 6,
    hasAnthropicKey,
  };
}
