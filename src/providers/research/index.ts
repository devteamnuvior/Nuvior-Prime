import { getResearchConfig } from "@/lib/researchConfig";
import { ClaudeResearchProvider } from "./claudeResearchProvider";
import { DisabledResearchProvider } from "./disabledResearchProvider";
import { MockResearchProvider } from "./mockResearchProvider";
import type { ResearchProvider } from "./types";

let singleton: ResearchProvider | null = null;

/**
 * Server-side research factory — separate from narrative LLM provider.
 */
export function getResearchProvider(): ResearchProvider {
  if (singleton) return singleton;

  const cfg = getResearchConfig();

  if (cfg.provider === "mock") {
    const simulateUnavailable =
      (process.env.AI_RESEARCH_UNAVAILABLE ?? "false").toLowerCase() === "true";
    singleton = new MockResearchProvider(
      simulateUnavailable ? { unavailable: true, reason: "AI_RESEARCH_UNAVAILABLE=true" } : undefined,
    );
    return singleton;
  }

  if (cfg.provider === "claude") {
    singleton = new ClaudeResearchProvider({
      model: cfg.model,
      timeoutMs: cfg.timeoutMs,
    });
    return singleton;
  }

  singleton = new DisabledResearchProvider();
  return singleton;
}

export function resetResearchProviderForTests(): void {
  singleton = null;
}

export type { ResearchProvider } from "./types";
