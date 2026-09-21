/**
 * Deterministic multi-source evidence resolution.
 * Conflicts are never silently resolved.
 */

import type { EvidenceRecord, ResolvedField, VerificationItem, VerificationStateCode } from "./types";
import { UNKNOWN_VERIFY } from "@/domain/terminology";

export function aggregateEvidence(
  accountId: string,
  accountName: string,
  records: EvidenceRecord[],
): { resolved: ResolvedField[]; verificationItems: VerificationItem[] } {
  const byField = new Map<string, EvidenceRecord[]>();
  for (const r of records) {
    const list = byField.get(r.fieldPath) ?? [];
    list.push(r);
    byField.set(r.fieldPath, list);
  }

  const resolved: ResolvedField[] = [];
  const verificationItems: VerificationItem[] = [];

  for (const [fieldPath, list] of byField) {
    const uniqueValues = [...new Set(list.map((r) => normalizeValue(r.value)))];
    const conflict = uniqueValues.length > 1 && !allCompatible(uniqueValues);

    if (conflict) {
      const value = `CONFLICT, verify: ${uniqueValues.join(" | ")}`;
      resolved.push({
        fieldPath,
        value,
        verificationState: "CONFLICT",
        evidence: list,
        conflict: true,
      });
      verificationItems.push({
        accountId,
        accountName,
        fieldPath,
        value,
        reason: "Conflicting source values",
        sourceType: "aggregation",
        sourceUrl: list[0]?.sourceUrl ?? null,
        status: "CONFLICT",
        snippet: list.map((r) => r.snippet).filter(Boolean).join(" || ").slice(0, 400),
      });
      continue;
    }

    const best = pickBest(list);
    const state = best.verificationState;
    resolved.push({
      fieldPath,
      value: best.value,
      verificationState: state,
      evidence: list,
      conflict: false,
    });

    if (needsQueue(state) || best.value.includes("UNKNOWN") || best.value.includes("AMBIGUOUS")) {
      verificationItems.push({
        accountId,
        accountName,
        fieldPath,
        value: best.value,
        reason: reasonFor(state, best.value),
        sourceType: best.sourceType,
        sourceUrl: best.sourceUrl,
        status: state === "VERIFIED_SOURCE" ? "MANUAL_VERIFY" : state,
        snippet: best.snippet,
      });
    }
  }

  return { resolved, verificationItems };
}

function normalizeValue(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

function allCompatible(values: string[]): boolean {
  // true/yes variants, or one value contained in another
  if (values.every((v) => v === "true" || v.startsWith("yes"))) return true;
  return values.some((a) => values.every((b) => a.includes(b) || b.includes(a)));
}

function pickBest(list: EvidenceRecord[]): EvidenceRecord {
  const rank = (s: VerificationStateCode) =>
    s === "VERIFIED_SOURCE" ? 4 : s === "DERIVED" ? 3 : s === "AMBIGUOUS" ? 2 : 1;
  return [...list].sort((a, b) => rank(b.verificationState) - rank(a.verificationState))[0]!;
}

function needsQueue(state: VerificationStateCode): boolean {
  return state === "AMBIGUOUS" || state === "UNKNOWN" || state === "MANUAL_VERIFY" || state === "CONFLICT";
}

function reasonFor(state: VerificationStateCode, value: string): string {
  if (value.includes("AMBIGUOUS")) return "Ambiguous language — confirm on site";
  if (state === "AMBIGUOUS") return "Extraction ambiguous";
  if (state === "UNKNOWN") return "Unknown / missing";
  if (state === "DERIVED") return "Derived from keywords — confirm";
  return "Needs manual verification";
}

export function buildMissingFieldVerification(
  accountId: string,
  accountName: string,
  fieldPaths: string[],
): VerificationItem[] {
  return fieldPaths.map((fieldPath) => ({
    accountId,
    accountName,
    fieldPath,
    value: UNKNOWN_VERIFY,
    reason: "No public source found",
    sourceType: "aggregation" as const,
    sourceUrl: null,
    status: "UNKNOWN" as const,
    snippet: null,
  }));
}

/** Deduplicate identical evidence rows (same field+value+url). */
export function dedupeEvidence(records: EvidenceRecord[]): EvidenceRecord[] {
  const seen = new Set<string>();
  const out: EvidenceRecord[] = [];
  for (const r of records) {
    const key = `${r.fieldPath}|${normalizeValue(r.value)}|${r.sourceUrl ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
