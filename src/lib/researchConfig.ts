/**
 * Server-side research provider configuration.
 */

export type ResearchProviderMode = "mock" | "claude" | "disabled";

export type ResearchConfig = {
  provider: ResearchProviderMode;
  cacheTtlSeconds: number;
  staleAfterSeconds: number;
  timeoutMs: number;
  model: string;
  hasAnthropicKey: boolean;
};

export function getResearchConfig(): ResearchConfig {
  const raw = (process.env.AI_RESEARCH_PROVIDER ?? "mock").toLowerCase();
  const provider = (["mock", "claude", "disabled"].includes(raw)
    ? raw
    : "disabled") as ResearchProviderMode;

  return {
    provider,
    cacheTtlSeconds: Number(process.env.AI_RESEARCH_CACHE_TTL_SECONDS ?? "86400") || 86400,
    staleAfterSeconds: Number(process.env.AI_RESEARCH_STALE_AFTER_SECONDS ?? "604800") || 604800,
    timeoutMs: Number(process.env.AI_RESEARCH_TIMEOUT_MS ?? "45000") || 45000,
    model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514",
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
  };
}

export function validateResearchEnv(): { ok: boolean; errors: string[]; warnings: string[] } {
  const cfg = getResearchConfig();
  const errors: string[] = [];
  const warnings: string[] = [];

  const raw = (process.env.AI_RESEARCH_PROVIDER ?? "mock").toLowerCase();
  if (!["mock", "claude", "disabled"].includes(raw)) {
    errors.push(
      `AI_RESEARCH_PROVIDER=${raw} is unsupported. Use mock|claude|disabled — will not silently fall back.`,
    );
  }

  if (cfg.provider === "claude" && !cfg.hasAnthropicKey) {
    warnings.push(
      "AI_RESEARCH_PROVIDER=claude but ANTHROPIC_API_KEY is missing — research will fail until configured.",
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}
