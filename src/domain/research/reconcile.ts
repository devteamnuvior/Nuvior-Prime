/**
 * Reconcile Claude research with deterministic extractor evidence.
 * Deterministic VERIFIED_SOURCE facts are not silently overridden.
 */

import type { EvidenceRecord } from "@/domain/enrichment/types";
import type { ReconciliationNote } from "./clinicCapabilityProfile";
import type { ResearchExtractionPayload } from "./schemas";

const DETERMINISTIC_FIELDS = [
  "injectablesOffered",
  "threadsOffered",
  "prpOffered",
  "peelsOffered",
  "skincareLines",
  "competitorBrandsVisible",
  "fillerToxinBrands",
  "threadBrands",
  "devicesOnSite",
] as const;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function reconcileWithDeterministicEvidence(
  payload: ResearchExtractionPayload,
  deterministicEvidence: EvidenceRecord[],
): { payload: ResearchExtractionPayload; notes: ReconciliationNote[] } {
  const notes: ReconciliationNote[] = [];
  const verified = deterministicEvidence.filter(
    (e) =>
      DETERMINISTIC_FIELDS.includes(e.fieldPath as (typeof DETERMINISTIC_FIELDS)[number]) &&
      e.verificationState === "VERIFIED_SOURCE",
  );

  for (const det of verified) {
    const detNorm = normalize(det.value);
    const related = findRelatedResearchItems(payload, det.fieldPath, detNorm);

    if (related.length === 0 && det.value && !det.value.includes("UNKNOWN")) {
      notes.push({
        fieldPath: det.fieldPath,
        deterministicValue: det.value,
        researchValue: null,
        resolution: "keep_deterministic",
        note: "Deterministic extractor confirmed value; research did not restate — deterministic signal retained in context.",
      });
      continue;
    }

    for (const item of related) {
      if (
        item.inventoryState === "CONFIRMED_PRESENT" &&
        !normalize(item.normalizedValue).includes(detNorm.split(/[,|]/)[0] ?? detNorm)
      ) {
        notes.push({
          fieldPath: det.fieldPath,
          deterministicValue: det.value,
          researchValue: item.normalizedValue,
          resolution: "conflict_visible",
          note: "Research value differs from deterministic VERIFIED_SOURCE — conflict preserved for review.",
        });
      } else {
        notes.push({
          fieldPath: det.fieldPath,
          deterministicValue: det.value,
          researchValue: item.normalizedValue,
          resolution: "research_adds_detail",
          note: "Research aligns with or adds detail to deterministic evidence.",
        });
      }
    }
  }

  return { payload, notes };
}

function findRelatedResearchItems(
  payload: ResearchExtractionPayload,
  fieldPath: string,
  detNorm: string,
): Array<{ normalizedValue: string; inventoryState: string }> {
  const pools = [
    ...payload.services,
    ...payload.brands,
    ...payload.capabilities,
    ...payload.devices,
  ];
  const keywords = fieldKeywords(fieldPath);
  return pools.filter((p) => {
    const nv = normalize(p.normalizedValue);
    return keywords.some((k) => detNorm.includes(k) || nv.includes(k));
  });
}

function fieldKeywords(fieldPath: string): string[] {
  switch (fieldPath) {
    case "threadsOffered":
      return ["thread", "pdo"];
    case "injectablesOffered":
      return ["botox", "filler", "toxin", "injectable"];
    case "prpOffered":
      return ["prp", "platelet"];
    case "peelsOffered":
      return ["peel", "chemical"];
    case "skincareLines":
    case "competitorBrandsVisible":
      return ["skinceuticals", "zo ", "skincare", "cosmeceutical"];
    case "devicesOnSite":
      return ["laser", "rf", "device", "morpheus"];
    default:
      return [];
  }
}

/** Apply reconciliation flags onto built profile items via notes lookup. */
export function markDeterministicConflicts(
  notes: ReconciliationNote[],
): Set<string> {
  return new Set(
    notes.filter((n) => n.resolution === "conflict_visible").map((n) => n.fieldPath),
  );
}
