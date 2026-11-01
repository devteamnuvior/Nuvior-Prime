import Anthropic from "@anthropic-ai/sdk";
import type { ClinicProfileRequest } from "@/domain/clinicProfile/prompts";
import {
  buildClinicProfileSystemPrompt,
  buildClinicProfileUserPrompt,
  provinceName,
} from "@/domain/clinicProfile/prompts";
import { extractJsonObject, validateClinicWebProfile } from "@/domain/clinicProfile/schema";
import { DEFAULT_CLAUDE_MODEL } from "@/lib/clinicProfileConfig";
import type { ClinicProfileProvider, ClinicProfileResult } from "./types";

const MAX_TURNS = 8;

/**
 * Claude with server-side web search + web fetch. Server-side only.
 * The model searches for the clinic, reads its site, and returns one JSON
 * object which is validated against the clinic profile schema.
 */
export class ClaudeClinicProfileProvider implements ClinicProfileProvider {
  readonly name = "claude";
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private maxSearches: number;
  private maxFetches: number;

  constructor(opts?: {
    apiKey?: string;
    model?: string;
    timeoutMs?: number;
    maxSearches?: number;
    maxFetches?: number;
  }) {
    this.apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = opts?.model ?? process.env.CLAUDE_MODEL ?? DEFAULT_CLAUDE_MODEL;
    this.timeoutMs = opts?.timeoutMs ?? 180000;
    this.maxSearches = opts?.maxSearches ?? 8;
    this.maxFetches = opts?.maxFetches ?? 6;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  getUnavailableReason(): string | null {
    if (this.apiKey) return null;
    return "ANTHROPIC_API_KEY missing — Claude clinic research unavailable";
  }

  async research(request: ClinicProfileRequest): Promise<ClinicProfileResult> {
    if (!this.apiKey) {
      return { ok: false, provider: this.name, error: "ANTHROPIC_API_KEY missing" };
    }

    const started = Date.now();
    const client = new Anthropic({ apiKey: this.apiKey, timeout: this.timeoutMs, maxRetries: 2 });
    const system = buildClinicProfileSystemPrompt();
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      { role: "user", content: buildClinicProfileUserPrompt(request) },
    ];

    let searchesUsed = 0;

    try {
      let finalText = "";
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const response = await client.beta.messages.create({
          model: this.model,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system,
          output_config: { effort: "medium" },
          tools: [
            {
              type: "web_search_20260209",
              name: "web_search",
              max_uses: this.maxSearches,
              user_location: {
                type: "approximate",
                country: "CA",
                region: provinceName(request.provinceCode),
                ...(request.city ? { city: request.city } : {}),
              },
            },
            {
              type: "web_fetch_20260209",
              name: "web_fetch",
              max_uses: this.maxFetches,
            },
          ],
          messages,
        });

        searchesUsed += response.usage.server_tool_use?.web_search_requests ?? 0;

        if (response.stop_reason === "refusal") {
          const category = response.stop_details?.category ?? "unspecified";
          return {
            ok: false,
            provider: this.name,
            error: `Claude declined this research request (${category})`,
          };
        }

        if (response.stop_reason === "pause_turn") {
          // Server tools hit their per-turn limit; hand the partial turn back and continue.
          messages.push({ role: "assistant", content: response.content });
          continue;
        }

        if (response.stop_reason === "max_tokens") {
          return { ok: false, provider: this.name, error: "Claude output was cut off (max_tokens)" };
        }

        finalText = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");
        break;
      }

      if (!finalText) {
        return { ok: false, provider: this.name, error: "Claude returned no answer after the search turns" };
      }

      let parsed: unknown;
      try {
        parsed = extractJsonObject(finalText);
      } catch {
        return { ok: false, provider: this.name, error: "Claude returned non-JSON content" };
      }

      const validated = validateClinicWebProfile(parsed);
      if (!validated.ok) {
        return { ok: false, provider: this.name, error: validated.errors.slice(0, 5).join("; ") };
      }

      return {
        ok: true,
        profile: validated.value,
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - started,
        searchesUsed,
      };
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) {
        return { ok: false, provider: this.name, error: "Anthropic API key was rejected" };
      }
      if (e instanceof Anthropic.RateLimitError) {
        return { ok: false, provider: this.name, error: "Anthropic rate limit reached — try again shortly" };
      }
      if (e instanceof Anthropic.APIError) {
        return { ok: false, provider: this.name, error: `Anthropic API error ${e.status ?? ""}: ${e.message}` };
      }
      if (e instanceof Anthropic.APIConnectionTimeoutError) {
        return { ok: false, provider: this.name, error: `Research timed out after ${this.timeoutMs}ms` };
      }
      return {
        ok: false,
        provider: this.name,
        error: e instanceof Error ? e.message : "Claude request failed",
      };
    }
  }
}
