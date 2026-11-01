import Anthropic from "@anthropic-ai/sdk";
import type { ClinicResearchContext } from "@/domain/research/clinicResearchContext";
import { buildResearchSystemPrompt, buildResearchUserPrompt } from "@/domain/research/prompts";
import { validateResearchExtraction } from "@/domain/research/schemas";
import { DEFAULT_CLAUDE_MODEL } from "@/lib/clinicProfileConfig";
import type { ResearchProvider, ResearchExtractionResult } from "./types";

/**
 * Claude Messages API via the official SDK — server-side only.
 * Fails (never falls back) when ANTHROPIC_API_KEY is missing.
 */
export class ClaudeResearchProvider implements ResearchProvider {
  readonly name = "claude";
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private baseUrl: string | undefined;

  constructor(opts?: { apiKey?: string; model?: string; timeoutMs?: number; baseUrl?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = opts?.model ?? process.env.CLAUDE_MODEL?.trim() ?? DEFAULT_CLAUDE_MODEL;
    this.timeoutMs = opts?.timeoutMs ?? Number(process.env.AI_RESEARCH_TIMEOUT_MS ?? 45000);
    this.baseUrl = opts?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? undefined;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  getUnavailableReason(): string | null {
    if (this.apiKey) return null;
    return "ANTHROPIC_API_KEY missing — Claude research unavailable";
  }

  async extract(context: ClinicResearchContext): Promise<ResearchExtractionResult> {
    if (!this.apiKey) {
      return {
        ok: false,
        provider: this.name,
        error: "ANTHROPIC_API_KEY missing",
        cacheHit: false,
      };
    }

    const started = Date.now();
    const client = new Anthropic({
      apiKey: this.apiKey,
      timeout: this.timeoutMs,
      maxRetries: 2,
      ...(this.baseUrl ? { baseURL: this.baseUrl } : {}),
    });

    try {
      const response = await client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: buildResearchSystemPrompt(),
        output_config: { effort: "medium" },
        messages: [{ role: "user", content: buildResearchUserPrompt(context) }],
      });

      if (response.stop_reason === "refusal") {
        return {
          ok: false,
          provider: this.name,
          error: `Claude declined this extraction (${response.stop_details?.category ?? "unspecified"})`,
          cacheHit: false,
        };
      }

      const rawText = response.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return {
            ok: false,
            provider: this.name,
            error: "Claude returned non-JSON content",
            cacheHit: false,
          };
        }
        parsed = JSON.parse(jsonMatch[0]!);
      }

      const validated = validateResearchExtraction(parsed);
      if (!validated.ok) {
        return {
          ok: false,
          provider: this.name,
          error: validated.errors.join("; "),
          cacheHit: false,
        };
      }

      return {
        ok: true,
        payload: validated.value,
        provider: this.name,
        model: this.model,
        cacheHit: false,
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      let msg: string;
      if (e instanceof Anthropic.AuthenticationError) msg = "Anthropic API key was rejected";
      else if (e instanceof Anthropic.RateLimitError) msg = "Anthropic rate limit reached — try again shortly";
      else if (e instanceof Anthropic.APIError) msg = `Anthropic API error ${e.status ?? ""}: ${e.message}`;
      else if (e instanceof Anthropic.APIConnectionTimeoutError) msg = `Research timed out after ${this.timeoutMs}ms`;
      else msg = e instanceof Error ? e.message : "Claude request failed";
      return { ok: false, provider: this.name, error: msg, cacheHit: false };
    }
  }
}
