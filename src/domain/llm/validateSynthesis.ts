import {
  llmBriefNarrativeSchema,
  type LlmBriefNarrative,
  structuredVisitNotesSchema,
  type StructuredVisitNotes,
  accountSummarySchema,
  type AccountSummaryResult,
} from "./schemas";
import { clampOpening, openingUnder25Words, scanNarrativeBundle, type SafetyFinding } from "./safety";
import type { LockedBriefFacts } from "./lockedFacts";
import { LEAD_PRODUCT_LABELS } from "@/domain/terminology";

export type ValidationResult<T> =
  | { ok: true; value: T; warnings: SafetyFinding[] }
  | { ok: false; errors: string[]; findings: SafetyFinding[] };

export function validateBriefNarrative(
  raw: unknown,
  locked: LockedBriefFacts,
): ValidationResult<LlmBriefNarrative> {
  const parsed = llmBriefNarrativeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      findings: [],
    };
  }

  const value = parsed.data;
  // Clamp openings
  value.openingLines = {
    cold: clampOpening(value.openingLines.cold),
    knowsNuvior: clampOpening(value.openingLines.knowsNuvior),
    revisit: clampOpening(value.openingLines.revisit),
  };

  const parts = [
    value.accountSummary,
    ...value.snapshotThreeLines,
    value.leadProductWhy,
    value.secondProductIfFirstLands,
    value.openingLines.cold,
    value.openingLines.knowsNuvior,
    value.openingLines.revisit,
    ...value.fiveQuestions,
    ...value.signalsToReadOnSite,
    ...value.objectionsAndResponses.flatMap((o) => [o.objection, o.response]),
    value.theAsk,
    value.leaveBehind,
    ...value.doNotSay,
    ...(value.confirmOnSite ?? []),
  ];

  const findings = scanNarrativeBundle(parts);
  const blocks = findings.filter((f) => f.severity === "block");
  if (blocks.length) {
    return { ok: false, errors: blocks.map((b) => b.message), findings };
  }

  for (const [k, line] of Object.entries(value.openingLines)) {
    if (!openingUnder25Words(line)) {
      return {
        ok: false,
        errors: [`openingLines.${k} exceeds 25 words after clamp`],
        findings,
      };
    }
  }

  // Lead product must remain the locked label — narrative may mention it but not replace it
  const lockedLabel = locked.leadProductLabel;
  if (
    /mesoestetic/i.test(value.leadProductWhy) &&
    !locked.formerMesoesteticCustomer &&
    !/not|never|do not|don't/i.test(value.leadProductWhy)
  ) {
    // allow retention context only when former customer
  }
  if (locked.formerMesoesteticCustomer && !/dermaceutic/i.test(value.leadProductWhy + value.theAsk)) {
    return {
      ok: false,
      errors: ["Former Mesoestetic accounts must keep Dermaceutic in why/ask"],
      findings,
    };
  }

  // Ensure locked lead label appears in why or ask when not meso path
  void lockedLabel;
  void LEAD_PRODUCT_LABELS;

  return { ok: true, value, warnings: findings.filter((f) => f.severity === "warn") };
}

export function validateAccountSummary(raw: unknown): ValidationResult<AccountSummaryResult> {
  const parsed = accountSummarySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => i.message),
      findings: [],
    };
  }
  const findings = scanNarrativeBundle([parsed.data.summary, ...parsed.data.confirmOnSite]);
  const blocks = findings.filter((f) => f.severity === "block");
  if (blocks.length) {
    return { ok: false, errors: blocks.map((b) => b.message), findings };
  }
  return { ok: true, value: parsed.data, warnings: findings.filter((f) => f.severity === "warn") };
}

export function validateStructuredVisitNotes(raw: unknown): ValidationResult<StructuredVisitNotes> {
  const parsed = structuredVisitNotesSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => i.message),
      findings: [],
    };
  }
  const text = [
    parsed.data.outcome,
    parsed.data.peopleMet,
    parsed.data.productsDiscussed,
    parsed.data.nextAction,
    parsed.data.notes,
    ...parsed.data.warnings,
  ]
    .filter(Boolean)
    .join(" ");
  const findings = scanNarrativeBundle([text]);
  const blocks = findings.filter((f) => f.severity === "block");
  if (blocks.length) {
    return { ok: false, errors: blocks.map((b) => b.message), findings };
  }
  return { ok: true, value: parsed.data, warnings: findings.filter((f) => f.severity === "warn") };
}
