import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from "./types";
import type { SynthesisContext } from "@/domain/llm/lockedFacts";
import type { LlmBriefNarrative } from "@/domain/llm/schemas";
import { clampOpening } from "@/domain/llm/safety";

/**
 * Deterministic mock LLM for local/dev/tests — no network.
 * Produces evidence-grounded narrative from locked facts + template baseline.
 */
export class MockLlmProvider implements LlmProvider {
  readonly name = "mock";

  isEnabled(): boolean {
    return true;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const started = Date.now();
    try {
      const user = JSON.parse(request.user) as {
        task?: string;
        lockedFacts?: SynthesisContext["locked"];
        templateBaseline?: SynthesisContext["templateBaseline"];
        knownPublic?: SynthesisContext["knownPublic"];
        evidence?: { fieldPath: string; value: string }[];
        thinInputWarnings?: string[];
        lastVisitNotes?: string | null;
        rawNotes?: string;
      };

      if (request.taskType === "structure_visit_notes" || user.task === "structure_visit_notes") {
        const raw = user.rawNotes ?? "";
        const content = structureNotesHeuristic(raw);
        return {
          ok: true,
          provider: this.name,
          model: "mock-heuristic",
          content,
          rawText: JSON.stringify(content),
          cacheHit: false,
          latencyMs: Date.now() - started,
        };
      }

      if (request.taskType === "account_summary" || user.task === "account_summary") {
        const locked = user.lockedFacts!;
        const evidenceBits = (user.evidence ?? [])
          .slice(0, 3)
          .map((e) => `${e.fieldPath}=${e.value}`)
          .join("; ");
        const content = {
          summary: `${locked.accountName} is Segment-fit for ${locked.leadProductLabel} (fit ${locked.fitScore}). ${locked.openingAngle}${evidenceBits ? ` Public signals: ${evidenceBits}.` : ""}`,
          confirmOnSite: user.thinInputWarnings?.slice(0, 3) ?? [],
        };
        return {
          ok: true,
          provider: this.name,
          model: "mock-heuristic",
          content,
          rawText: JSON.stringify(content),
          cacheHit: false,
          latencyMs: Date.now() - started,
        };
      }

      // brief narrative
      const locked = user.lockedFacts!;
      const base = user.templateBaseline!;
      const evidenceHint =
        (user.evidence ?? [])
          .filter((e) => /injectable|thread|skincare|service|people/i.test(e.fieldPath))
          .slice(0, 2)
          .map((e) => e.value)
          .join("; ") || "confirm services on site";

      const narrative: LlmBriefNarrative = {
        accountSummary: `${locked.accountName} — ${locked.categoryLabel}. Locked lead ${locked.leadProductLabel} (fit ${locked.fitScore}). ${locked.formerMesoesteticCustomer ? "Former Mesoestetic: Dermaceutic retention." : locked.openingAngle}`,
        snapshotThreeLines: [
          base.snapshotThreeLines[0],
          base.snapshotThreeLines[1],
          `Evidence-grounded signals: ${evidenceHint}.`,
        ],
        leadProductWhy: base.leadProductWhy,
        secondProductIfFirstLands: base.secondProductIfFirstLands,
        openingLines: {
          cold: clampOpening(base.openingLines.cold),
          knowsNuvior: clampOpening(base.openingLines.knowsNuvior),
          revisit: clampOpening(base.openingLines.revisit),
        },
        fiveQuestions: base.fiveQuestions,
        signalsToReadOnSite: base.signalsToReadOnSite,
        objectionsAndResponses: locked.formerMesoesteticCustomer
          ? [
              {
                objection: "We used Mesoestetic with you before.",
                response:
                  "Remaining stock is available while it lasts; Dermaceutic is the ongoing clinical line we can plan around.",
              },
              ...base.objectionsAndResponses.slice(0, 2),
            ]
          : base.objectionsAndResponses,
        theAsk: base.theAsk,
        leaveBehind: base.leaveBehind,
        doNotSay: base.doNotSay.slice(0, 3),
        confirmOnSite: user.thinInputWarnings ?? [],
      };

      return {
        ok: true,
        provider: this.name,
        model: "mock-heuristic",
        content: narrative,
        rawText: JSON.stringify(narrative),
        cacheHit: false,
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      return {
        ok: false,
        provider: this.name,
        error: e instanceof Error ? e.message : "mock LLM failed",
        cacheHit: false,
      };
    }
  }
}

function structureNotesHeuristic(raw: string) {
  const warnings: string[] = [];
  if (/patient\s+(name|id|dob|chart)/i.test(raw)) {
    warnings.push("Possible patient identifiers detected — omitted from structured fields");
  }
  const products: string[] = [];
  for (const p of ["Aptos", "Dermaceutic", "Fidia", "GESKE", "Hy-tissue", "Mesoestetic"]) {
    if (new RegExp(p, "i").test(raw)) products.push(p);
  }
  const people =
    raw.match(/(?:met|spoke with|saw)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ?? null;
  const followUp =
    raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] ??
    raw.match(/\b(follow[- ]?up\s+\w+\s+\d{1,2})\b/i)?.[1] ??
    null;

  return {
    visitType: /re-?visit/i.test(raw)
      ? "re-visit"
      : /quote|follow/i.test(raw)
        ? "follow-up on a quote"
        : "first visit",
    outcome: /interested|demo|sample|training|no interest/i.test(raw)
      ? raw.match(/interested|demo booked|sample left|training date|no interest/i)?.[0] ?? null
      : null,
    peopleMet: people,
    productsDiscussed: products.length ? products.join(", ") : null,
    nextAction: /book|send|follow|call|email/i.test(raw)
      ? raw.split(/[.!?]/).find((s) => /book|send|follow|call|email/i.test(s))?.trim() ?? null
      : null,
    followUpDate: followUp && /^\d{4}-\d{2}-\d{2}$/.test(followUp) ? followUp : null,
    notes: warnings.length ? raw.replace(/patient\s+(name|id|dob|chart)[^.]*\.?/gi, "").trim() : raw.trim(),
    warnings,
  };
}

export class NoneLlmProvider implements LlmProvider {
  readonly name = "none";
  isEnabled(): boolean {
    return false;
  }
  async complete(): Promise<LlmCompletionResult> {
    return {
      ok: false,
      provider: this.name,
      error: "LLM_PROVIDER=none",
      cacheHit: false,
    };
  }
}
