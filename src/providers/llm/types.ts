import type { SynthesisContext } from "@/domain/llm/lockedFacts";
import type { LlmBriefNarrative, StructuredVisitNotes, AccountSummaryResult } from "@/domain/llm/schemas";

export type LlmTaskType = "brief_narrative" | "account_summary" | "structure_visit_notes";

export type LlmCompletionRequest = {
  taskType: LlmTaskType;
  system: string;
  user: string;
  /** Optional JSON schema hint for providers */
  schemaName?: string;
};

export type LlmCompletionResult = {
  ok: true;
  provider: string;
  model: string;
  content: unknown;
  rawText: string;
  cacheHit: boolean;
  latencyMs: number;
} | {
  ok: false;
  provider: string;
  error: string;
  cacheHit: boolean;
};

/**
 * Pluggable LLM — synthesis only. Never authoritative for qualification/CRM.
 */
export interface LlmProvider {
  readonly name: string;
  isEnabled(): boolean;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

export type BriefSynthesisSuccess = {
  ok: true;
  narrative: LlmBriefNarrative;
  provider: string;
  model: string;
  cacheHit: boolean;
  warnings: string[];
};

export type BriefSynthesisFailure = {
  ok: false;
  reason: string;
  provider: string;
};

export type AccountSummarySynthesis =
  | { ok: true; result: AccountSummaryResult; provider: string; model: string; cacheHit: boolean }
  | { ok: false; reason: string; provider: string };

export type VisitNotesSynthesis =
  | { ok: true; result: StructuredVisitNotes; provider: string; model: string; cacheHit: boolean }
  | { ok: false; reason: string; provider: string };

export type { SynthesisContext };
