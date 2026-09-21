import type { ClinicResearchContext } from "@/domain/research/clinicResearchContext";
import { buildResearchSystemPrompt, buildResearchUserPrompt } from "@/domain/research/prompts";
import { validateResearchExtraction } from "@/domain/research/schemas";
import type { ResearchProvider, ResearchExtractionResult } from "./types";

/**
 * Claude Messages API — server-side only.
 * Uses public Anthropic API contract; fails when ANTHROPIC_API_KEY is missing.
 */
export class ClaudeResearchProvider implements ResearchProvider {
  readonly name = "claude";
  private apiKey: string;
  private model: string;
  private timeoutMs: number;
  private baseUrl: string;

  constructor(opts?: { apiKey?: string; model?: string; timeoutMs?: number; baseUrl?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.model = opts?.model ?? process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514";
    this.timeoutMs = opts?.timeoutMs ?? Number(process.env.AI_RESEARCH_TIMEOUT_MS ?? 45000);
    this.baseUrl = opts?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1";
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
    const system = buildResearchSystemPrompt();
    const user = buildResearchUserPrompt(context);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          temperature: 0,
          system,
          messages: [{ role: "user", content: user }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        return {
          ok: false,
          provider: this.name,
          error: `Anthropic HTTP ${res.status}: ${body.slice(0, 200)}`,
          cacheHit: false,
        };
      }

      const data = (await res.json()) as {
        content?: { type: string; text?: string }[];
      };
      const rawText =
        data.content?.find((c) => c.type === "text")?.text ??
        data.content?.[0]?.text ??
        "";

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
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? `Research timed out after ${this.timeoutMs}ms`
          : e instanceof Error
            ? e.message
            : "Claude request failed";
      return { ok: false, provider: this.name, error: msg, cacheHit: false };
    } finally {
      clearTimeout(timer);
    }
  }
}
