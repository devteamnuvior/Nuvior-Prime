/**
 * Deterministic NUVIOR taxonomy classification.
 * Google types / discovery signals are evidence only — final labels are exact §03 taxonomy.
 */

import { findTaxonomyLabel } from "./taxonomy";
import {
  ORGANIZATION_TYPE_LABELS,
  type OrganizationTypeCode,
} from "./terminology";
import type { RawPlace } from "@/providers/places/types";

export type ClassificationResult = {
  segmentNumber: number;
  categoryNumber: number;
  categoryLabel: string;
  organizationType: OrganizationTypeCode;
  organizationTypeLabel: string;
  confidence: "high" | "medium" | "low";
  needsVerification: boolean;
  evidenceNotes: string[];
  /** Outside taxonomy → exclude from visit list. */
  inTaxonomy: boolean;
};

type Rule = {
  segmentNumber: number;
  categoryNumber: number;
  /** Match against lowercase name + types + signals */
  patterns: RegExp[];
  confidence: "high" | "medium" | "low";
};

const RULES: Rule[] = [
  { segmentNumber: 1, categoryNumber: 1, patterns: [/plastic surgery/, /cosmetic surgery/], confidence: "high" },
  { segmentNumber: 1, categoryNumber: 2, patterns: [/dermatolog/], confidence: "high" },
  { segmentNumber: 1, categoryNumber: 3, patterns: [/cosmetic medicine/, /cosmetic physician/, /cosmetic md\b/, /family physician.*cosmetic|cosmetic.*gp/], confidence: "high" },
  { segmentNumber: 1, categoryNumber: 4, patterns: [/nurse practitioner|np injectable|np-led/], confidence: "high" },
  { segmentNumber: 1, categoryNumber: 5, patterns: [/facial plastic/], confidence: "high" },
  { segmentNumber: 1, categoryNumber: 6, patterns: [/oculoplastic|ophthalmology aesthetic/], confidence: "high" },
  { segmentNumber: 1, categoryNumber: 7, patterns: [/hair restoration|hair transplant/], confidence: "high" },
  { segmentNumber: 1, categoryNumber: 8, patterns: [/tricholog|medical hair loss/], confidence: "high" },
  { segmentNumber: 1, categoryNumber: 9, patterns: [/regenerative medicine|longevity|anti-?ageing medicine|anti-?aging medicine/], confidence: "medium" },
  { segmentNumber: 1, categoryNumber: 10, patterns: [/walk-?in.*cosmetic|family medicine.*cosmetic/], confidence: "medium" },
  { segmentNumber: 1, categoryNumber: 11, patterns: [/\bimg\b|international medical graduate/], confidence: "medium" },
  { segmentNumber: 1, categoryNumber: 12, patterns: [/naturopath|\bnd\b clinic|naturopathic/], confidence: "high" },

  { segmentNumber: 2, categoryNumber: 1, patterns: [/sports medicine/], confidence: "high" },
  { segmentNumber: 2, categoryNumber: 2, patterns: [/orthopaedic|orthopedic|sports injury/], confidence: "high" },
  { segmentNumber: 2, categoryNumber: 3, patterns: [/pain management/], confidence: "high" },
  { segmentNumber: 2, categoryNumber: 4, patterns: [/physiatry|physical medicine|rehabilitation clinic/], confidence: "medium" },
  { segmentNumber: 2, categoryNumber: 5, patterns: [/podiatry|foot clinic/], confidence: "high" },
  { segmentNumber: 2, categoryNumber: 6, patterns: [/gynaecolog|gynecolog|women'?s health/], confidence: "high" },

  { segmentNumber: 3, categoryNumber: 1, patterns: [/med\s?spa|medical spa|medspa/], confidence: "high" },
  { segmentNumber: 3, categoryNumber: 2, patterns: [/nurse injector|rn-led|rn injector/], confidence: "high" },
  { segmentNumber: 3, categoryNumber: 3, patterns: [/laser.*skin|skin clinic/], confidence: "medium" },
  { segmentNumber: 3, categoryNumber: 4, patterns: [/body contour|body sculpt/], confidence: "high" },
  { segmentNumber: 3, categoryNumber: 5, patterns: [/medspa group|franchise head office/], confidence: "medium" },
  { segmentNumber: 3, categoryNumber: 6, patterns: [/iv therapy|infusion lounge|wellness infusion/], confidence: "high" },

  { segmentNumber: 4, categoryNumber: 1, patterns: [/aesthetician|facial bar|skin studio/], confidence: "medium" },
  { segmentNumber: 4, categoryNumber: 2, patterns: [/acne clinic|acne specialist/], confidence: "high" },
  { segmentNumber: 4, categoryNumber: 3, patterns: [/pigment|melasma|depigmentation/], confidence: "high" },
  { segmentNumber: 4, categoryNumber: 4, patterns: [/microneedling|dermaplaning/], confidence: "high" },
  { segmentNumber: 4, categoryNumber: 5, patterns: [/permanent makeup|microblading|\bpmu\b/], confidence: "high" },
  { segmentNumber: 4, categoryNumber: 6, patterns: [/laser hair removal/], confidence: "high" },
  { segmentNumber: 4, categoryNumber: 7, patterns: [/lash|brow|waxing studio/], confidence: "medium" },
  { segmentNumber: 4, categoryNumber: 8, patterns: [/men'?s grooming|barbershop/], confidence: "medium" },

  { segmentNumber: 5, categoryNumber: 1, patterns: [/day spa/], confidence: "high" },
  { segmentNumber: 5, categoryNumber: 2, patterns: [/hotel spa|resort spa|destination spa/], confidence: "high" },
  { segmentNumber: 5, categoryNumber: 3, patterns: [/wellness spa|hammam|bathhouse/], confidence: "medium" },
  { segmentNumber: 5, categoryNumber: 4, patterns: [/massage.*skin|massage therapy/], confidence: "low" },
  { segmentNumber: 5, categoryNumber: 5, patterns: [/gym|fitness studio|recovery lounge/], confidence: "low" },
  { segmentNumber: 5, categoryNumber: 6, patterns: [/nail salon|hair salon/], confidence: "low" },

  { segmentNumber: 6, categoryNumber: 1, patterns: [/esthetics school|beauty (training )?academy/], confidence: "high" },
  { segmentNumber: 6, categoryNumber: 2, patterns: [/injector.*academy|aesthetics training/], confidence: "high" },
  { segmentNumber: 6, categoryNumber: 3, patterns: [/pharmacy|compounding/], confidence: "medium" },
  { segmentNumber: 6, categoryNumber: 4, patterns: [/skincare boutique|clean beauty|beauty boutique/], confidence: "high" },
  { segmentNumber: 6, categoryNumber: 5, patterns: [/beauty device|electronics retailer/], confidence: "medium" },
  { segmentNumber: 6, categoryNumber: 6, patterns: [/beauty supply/], confidence: "medium" },
  { segmentNumber: 6, categoryNumber: 7, patterns: [/corporate gifting|hotel retail/], confidence: "low" },

  // Broader fallbacks from Google types / generic aesthetics
  { segmentNumber: 1, categoryNumber: 3, patterns: [/beauty_salon/, /medical aesthetics/, /thread lift/, /pdo thread/, /botox/, /filler clinic/], confidence: "low" },
  { segmentNumber: 3, categoryNumber: 1, patterns: [/spa\b/, /health spa/], confidence: "low" },
];

function haystack(place: RawPlace): string {
  return [
    place.businessName,
    place.primaryType ?? "",
    ...place.googleTypes,
    ...place.discoverySignals,
  ]
    .join(" ")
    .toLowerCase();
}

function inferOrganizationType(place: RawPlace): OrganizationTypeCode {
  const h = haystack(place);
  if (/hospital|university|academic|clinic at /.test(h)) return "HOSPITAL_OR_ACADEMIC";
  if (/head office|hq\b|franchise/.test(h)) return "CHAIN_HEAD_OFFICE";
  if (/chain|locations|multi-?location/.test(h)) return "CHAIN_LOCATION";
  return "INDEPENDENT";
}

export function classifyPlace(place: RawPlace): ClassificationResult {
  const text = haystack(place);
  const evidenceNotes: string[] = [];
  if (place.discoverySignals.length) {
    evidenceNotes.push(`Discovery signals: ${place.discoverySignals.join(", ")}`);
  }
  if (place.primaryType) {
    evidenceNotes.push(`Google primaryType: ${place.primaryType}`);
  }
  if (place.googleTypes.length) {
    evidenceNotes.push(`Google types: ${place.googleTypes.slice(0, 8).join(", ")}`);
  }

  let best: Rule | null = null;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      if (
        !best ||
        confidenceRank(rule.confidence) > confidenceRank(best.confidence)
      ) {
        best = rule;
      }
      // Prefer first high-confidence match in rule order (more specific first)
      if (rule.confidence === "high") {
        best = rule;
        break;
      }
    }
  }

  const organizationType = inferOrganizationType(place);

  if (!best) {
    return {
      segmentNumber: 0,
      categoryNumber: 0,
      categoryLabel: "UNKNOWN, verify",
      organizationType,
      organizationTypeLabel: ORGANIZATION_TYPE_LABELS[organizationType],
      confidence: "low",
      needsVerification: true,
      evidenceNotes: [...evidenceNotes, "No taxonomy rule matched"],
      inTaxonomy: false,
    };
  }

  const label = findTaxonomyLabel(best.segmentNumber, best.categoryNumber);
  if (!label) {
    return {
      segmentNumber: 0,
      categoryNumber: 0,
      categoryLabel: "UNKNOWN, verify",
      organizationType,
      organizationTypeLabel: ORGANIZATION_TYPE_LABELS[organizationType],
      confidence: "low",
      needsVerification: true,
      evidenceNotes: [...evidenceNotes, "Matched rule missing from seeded taxonomy"],
      inTaxonomy: false,
    };
  }

  return {
    segmentNumber: best.segmentNumber,
    categoryNumber: best.categoryNumber,
    categoryLabel: label,
    organizationType,
    organizationTypeLabel: ORGANIZATION_TYPE_LABELS[organizationType],
    confidence: best.confidence,
    needsVerification: best.confidence !== "high",
    evidenceNotes,
    inTaxonomy: true,
  };
}

function confidenceRank(c: "high" | "medium" | "low"): number {
  return c === "high" ? 3 : c === "medium" ? 2 : 1;
}
