/**
 * AI safety filters for synthesized sales copy (spec §09).
 */

export type SafetyFinding = {
  code: string;
  message: string;
  severity: "block" | "warn";
};

const BLOCKED_PHRASES = [
  /\bresults?\s+are\s+guaranteed\b/i,
  /\bguaranteed\s+results?\b/i,
  /\bpermanently\s+(fix|remove|eliminate|cure)/i,
  /\bpermanent\s+(results?|fix|cure)\b/i,
  /\bcures?\s+(wrinkles?|aging|acne|disease)/i,
  /\bwill\s+(definitely|always)\b/i,
  /\bpatient\s+(name|id|record|chart|dob)\b/i,
];

const MESO_LEAD = /\blead\s+with\s+mesoestetic\b|\brecommend\s+mesoestetic\s+as\s+(?:a\s+)?lead\b/i;
const MESO_SUPPLY_AFFIRM =
  /\b(?:we\s+)?(?:promise|guarantee|ensuring)\s+[^.]{0,40}future\s+mesoestetic\s+supply\b|\bexclusive\s+mesoestetic\s+distributor\b/i;
const MESO_SUPPLY_NEGATED =
  /\b(?:never|do not|don't|do\s+not)\b[^.]{0,80}(?:future\s+mesoestetic|mesoestetic\s+supply)/i;

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function scanSafety(text: string): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  for (const re of BLOCKED_PHRASES) {
    if (re.test(text)) {
      findings.push({
        code: "FORBIDDEN_CLAIM",
        message: `Blocked language matched ${re}`,
        severity: "block",
      });
    }
  }
  if (MESO_LEAD.test(text)) {
    findings.push({
      code: "MESOESTETIC_LEAD",
      message: "Must never recommend Mesoestetic as lead",
      severity: "block",
    });
  }
  if (MESO_SUPPLY_AFFIRM.test(text) && !MESO_SUPPLY_NEGATED.test(text)) {
    findings.push({
      code: "MESOESTETIC_SUPPLY",
      message: "Must not promise future Mesoestetic supply",
      severity: "block",
    });
  }
  return findings;
}

export function scanNarrativeBundle(parts: string[]): SafetyFinding[] {
  return parts.flatMap(scanSafety);
}

export function openingUnder25Words(line: string): boolean {
  return wordCount(line) <= 25;
}

export function clampOpening(line: string): string {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 25) return line.trim();
  return words.slice(0, 25).join(" ");
}
