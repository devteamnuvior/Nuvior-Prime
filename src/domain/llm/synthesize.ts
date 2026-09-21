import { createHash } from "crypto";
import type { LlmProvider, BriefSynthesisSuccess, BriefSynthesisFailure, AccountSummarySynthesis, VisitNotesSynthesis } from "@/providers/llm/types";
import type { SynthesisContext } from "./lockedFacts";
import {
  buildBriefSystemPrompt,
  buildBriefUserPrompt,
  buildAccountSummaryUserPrompt,
  buildVisitNotesSystemPrompt,
  buildVisitNotesUserPrompt,
} from "./prompts";
import {
  validateBriefNarrative,
  validateAccountSummary,
  validateStructuredVisitNotes,
} from "./validateSynthesis";
import { getLlmCache, setLlmCache } from "@/lib/llmCache";
import type { PreVisitBriefPayload } from "@/domain/brief";
import { LEAD_PRODUCT_LABELS } from "@/domain/terminology";

export type LlmMeta = {
  provider: string;
  model: string | null;
  cacheHit: boolean;
  fallbackReason: string | null;
  safetyWarnings: string[];
  evidenceCount: number;
  accountSummary: string | null;
};

export async function synthesizeBriefNarrative(
  llm: LlmProvider,
  ctx: SynthesisContext,
): Promise<BriefSynthesisSuccess | BriefSynthesisFailure> {
  if (!llm.isEnabled()) {
    return { ok: false, reason: "LLM disabled", provider: llm.name };
  }

  const system = buildBriefSystemPrompt();
  const user = buildBriefUserPrompt(ctx);
  const cacheKey = hashKey(["brief_narrative", llm.name, system, user]);

  const cached = await getLlmCache(cacheKey);
  if (cached) {
    const validated = validateBriefNarrative(cached.content, ctx.locked);
    if (validated.ok) {
      return {
        ok: true,
        narrative: validated.value,
        provider: llm.name,
        model: cached.model,
        cacheHit: true,
        warnings: validated.warnings.map((w) => w.message),
      };
    }
  }

  const completion = await llm.complete({
    taskType: "brief_narrative",
    system,
    user,
    schemaName: "llmBriefNarrative",
  });

  if (!completion.ok) {
    return { ok: false, reason: completion.error, provider: llm.name };
  }

  const validated = validateBriefNarrative(completion.content, ctx.locked);
  if (!validated.ok) {
    return {
      ok: false,
      reason: validated.errors.join("; "),
      provider: llm.name,
    };
  }

  await setLlmCache({
    cacheKey,
    provider: llm.name,
    model: completion.model,
    taskType: "brief_narrative",
    promptHash: cacheKey,
    requestJson: { system, user },
    responseJson: validated.value,
  });

  return {
    ok: true,
    narrative: validated.value,
    provider: llm.name,
    model: completion.model,
    cacheHit: completion.cacheHit,
    warnings: validated.warnings.map((w) => w.message),
  };
}

/**
 * Merge LLM narrative onto template brief while re-asserting locked lead product.
 */
export function mergeBriefWithNarrative(
  template: PreVisitBriefPayload,
  synthesis: BriefSynthesisSuccess,
  lockedLeadLabel: string,
): PreVisitBriefPayload {
  const n = synthesis.narrative;
  return {
    ...template,
    snapshotThreeLines: n.snapshotThreeLines,
    leadProductForVisit: lockedLeadLabel,
    leadProductWhy: n.leadProductWhy,
    secondProductIfFirstLands: n.secondProductIfFirstLands,
    openingLines: n.openingLines,
    fiveQuestions: n.fiveQuestions,
    signalsToReadOnSite: n.signalsToReadOnSite,
    objectionsAndResponses: n.objectionsAndResponses,
    theAsk: n.theAsk,
    leaveBehind: n.leaveBehind,
    doNotSay: n.doNotSay,
    thinInputWarnings:
      n.confirmOnSite && n.confirmOnSite.length
        ? n.confirmOnSite
        : template.thinInputWarnings,
    generator: "llm",
    accountSummary: n.accountSummary,
    llmMeta: {
      provider: synthesis.provider,
      model: synthesis.model,
      cacheHit: synthesis.cacheHit,
      fallbackReason: null,
      safetyWarnings: synthesis.warnings,
      evidenceCount: 0,
      accountSummary: n.accountSummary,
    },
  };
}

export function withTemplateFallback(
  template: PreVisitBriefPayload,
  reason: string,
  provider: string,
): PreVisitBriefPayload {
  return {
    ...template,
    generator: "llm_fallback",
    accountSummary: template.snapshotThreeLines.join(" "),
    llmMeta: {
      provider,
      model: null,
      cacheHit: false,
      fallbackReason: reason,
      safetyWarnings: [],
      evidenceCount: 0,
      accountSummary: null,
    },
  };
}

export async function synthesizeAccountSummary(
  llm: LlmProvider,
  ctx: SynthesisContext,
): Promise<AccountSummarySynthesis> {
  if (!llm.isEnabled()) {
    return { ok: false, reason: "LLM disabled", provider: llm.name };
  }
  const system = buildBriefSystemPrompt();
  const user = buildAccountSummaryUserPrompt(ctx);
  const cacheKey = hashKey(["account_summary", llm.name, user]);
  const cached = await getLlmCache(cacheKey);
  if (cached) {
    const v = validateAccountSummary(cached.content);
    if (v.ok) {
      return {
        ok: true,
        result: v.value,
        provider: llm.name,
        model: cached.model,
        cacheHit: true,
      };
    }
  }
  const completion = await llm.complete({
    taskType: "account_summary",
    system,
    user,
  });
  if (!completion.ok) {
    return { ok: false, reason: completion.error, provider: llm.name };
  }
  const validated = validateAccountSummary(completion.content);
  if (!validated.ok) {
    return { ok: false, reason: validated.errors.join("; "), provider: llm.name };
  }
  await setLlmCache({
    cacheKey,
    provider: llm.name,
    model: completion.model,
    taskType: "account_summary",
    promptHash: cacheKey,
    requestJson: { user },
    responseJson: validated.value,
  });
  return {
    ok: true,
    result: validated.value,
    provider: llm.name,
    model: completion.model,
    cacheHit: false,
  };
}

export async function structureVisitNotesWithLlm(
  llm: LlmProvider,
  rawNotes: string,
): Promise<VisitNotesSynthesis> {
  if (!llm.isEnabled()) {
    return { ok: false, reason: "LLM disabled", provider: llm.name };
  }
  const system = buildVisitNotesSystemPrompt();
  const user = buildVisitNotesUserPrompt(rawNotes);
  const cacheKey = hashKey(["visit_notes", llm.name, rawNotes]);
  const cached = await getLlmCache(cacheKey);
  if (cached) {
    const v = validateStructuredVisitNotes(cached.content);
    if (v.ok) {
      return {
        ok: true,
        result: v.value,
        provider: llm.name,
        model: cached.model,
        cacheHit: true,
      };
    }
  }
  const completion = await llm.complete({
    taskType: "structure_visit_notes",
    system,
    user,
  });
  if (!completion.ok) {
    return { ok: false, reason: completion.error, provider: llm.name };
  }
  const validated = validateStructuredVisitNotes(completion.content);
  if (!validated.ok) {
    return { ok: false, reason: validated.errors.join("; "), provider: llm.name };
  }
  await setLlmCache({
    cacheKey,
    provider: llm.name,
    model: completion.model,
    taskType: "structure_visit_notes",
    promptHash: cacheKey,
    requestJson: { rawNotes },
    responseJson: validated.value,
  });
  return {
    ok: true,
    result: validated.value,
    provider: llm.name,
    model: completion.model,
    cacheHit: false,
  };
}

export function lockedLeadLabel(code: keyof typeof LEAD_PRODUCT_LABELS | string): string {
  return LEAD_PRODUCT_LABELS[code as keyof typeof LEAD_PRODUCT_LABELS] ?? String(code);
}

function hashKey(parts: string[]): string {
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}
