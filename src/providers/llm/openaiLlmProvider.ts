import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "./types";

/**
 * OpenAI Chat Completions via fetch — optional.
 * Does not invent endpoints beyond the public OpenAI API.
 */
export class OpenAiLlmProvider implements LlmProvider {
  readonly name = "openai";
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(opts?: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = opts?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    this.baseUrl = opts?.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (!this.apiKey) {
      return {
        ok: false,
        provider: this.name,
        error: "OPENAI_API_KEY missing",
        cacheHit: false,
      };
    }

    const started = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return {
          ok: false,
          provider: this.name,
          error: `OpenAI HTTP ${res.status}: ${body.slice(0, 200)}`,
          cacheHit: false,
        };
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const rawText = data.choices?.[0]?.message?.content ?? "";
      let content: unknown = null;
      try {
        content = JSON.parse(rawText);
      } catch {
        return {
          ok: false,
          provider: this.name,
          error: "OpenAI returned non-JSON content",
          cacheHit: false,
        };
      }

      return {
        ok: true,
        provider: this.name,
        model: this.model,
        content,
        rawText,
        cacheHit: false,
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      return {
        ok: false,
        provider: this.name,
        error: e instanceof Error ? e.message : "OpenAI request failed",
        cacheHit: false,
      };
    }
  }
}
