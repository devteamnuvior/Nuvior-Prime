/**
 * Primary opportunity selection — deterministic tie-breaking.
 */

import type { ProductOpportunity, PrimaryRecommendationStatus } from "./productOpportunityAnalysis";
import {
  CONFIDENCE_RANK,
  PRIMARY_CONFIRMED_MIN_CONFIDENCE,
  PRIMARY_PENDING_VERIFICATION_MIN_SCORE,
  PRIMARY_RECOMMENDATION_MIN_SCORE,
} from "./scoringConfig";
import type { ProfileEvidenceRef } from "@/domain/research/clinicCapabilityProfile";

export type PrimarySelectionResult = {
  primaryOpportunityId: string | null;
  primaryProductId: string | null;
  primaryRecommendationStatus: PrimaryRecommendationStatus;
  noRecommendationReasons: string[];
};

function verifiedEvidenceCount(
  opp: ProductOpportunity,
  evidenceById: Map<string, ProfileEvidenceRef>,
): number {
  let count = 0;
  for (const id of opp.evidenceRefIds) {
    const ref = evidenceById.get(id);
    if (ref?.confidence === "HIGH") count += 1;
  }
  return count;
}

export function compareOpportunities(
  a: ProductOpportunity,
  b: ProductOpportunity,
  evidenceById: Map<string, ProfileEvidenceRef>,
  catalogPriority: Map<string, number | null>,
): number {
  if (b.opportunityScore !== a.opportunityScore) {
    return b.opportunityScore - a.opportunityScore;
  }
  if (CONFIDENCE_RANK[b.confidence] !== CONFIDENCE_RANK[a.confidence]) {
    return CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
  }
  const evA = verifiedEvidenceCount(a, evidenceById);
  const evB = verifiedEvidenceCount(b, evidenceById);
  if (evB !== evA) return evB - evA;
  const priA = catalogPriority.get(a.productId) ?? 0;
  const priB = catalogPriority.get(b.productId) ?? 0;
  if (priB !== priA) return priB - priA;
  return a.productId.localeCompare(b.productId);
}

export function selectPrimaryOpportunity(
  opportunities: ProductOpportunity[],
  input: {
    doNotContact: boolean;
    evidenceById: Map<string, ProfileEvidenceRef>;
    catalogPriority: Map<string, number | null>;
  },
): PrimarySelectionResult {
  const noRecommendationReasons: string[] = [];

  if (input.doNotContact) {
    return {
      primaryOpportunityId: null,
      primaryProductId: null,
      primaryRecommendationStatus: "BLOCKED_DNC",
      noRecommendationReasons: [
        "Account is do-not-contact — opportunities computed but no actionable primary.",
      ],
    };
  }

  const eligible = opportunities.filter((o) => o.eligibilityState === "ELIGIBLE");
  if (eligible.length === 0) {
    return {
      primaryOpportunityId: null,
      primaryProductId: null,
      primaryRecommendationStatus: "NONE",
      noRecommendationReasons: ["No eligible product opportunities after hard gates."],
    };
  }

  const ranked = [...eligible].sort((a, b) =>
    compareOpportunities(a, b, input.evidenceById, input.catalogPriority),
  );
  const top = ranked[0]!;
  const needsVerification = top.verificationRequired;

  if (top.opportunityScore < PRIMARY_RECOMMENDATION_MIN_SCORE) {
    if (needsVerification && top.opportunityScore >= PRIMARY_PENDING_VERIFICATION_MIN_SCORE) {
      return {
        primaryOpportunityId: top.id,
        primaryProductId: top.productId,
        primaryRecommendationStatus: "PENDING_VERIFICATION",
        noRecommendationReasons: [],
      };
    }
    noRecommendationReasons.push(
      `Top opportunity score ${top.opportunityScore} below minimum threshold ${PRIMARY_RECOMMENDATION_MIN_SCORE}.`,
    );
    return {
      primaryOpportunityId: null,
      primaryProductId: null,
      primaryRecommendationStatus: "NONE",
      noRecommendationReasons,
    };
  }

  const confOk =
    CONFIDENCE_RANK[top.confidence] >= CONFIDENCE_RANK[PRIMARY_CONFIRMED_MIN_CONFIDENCE];

  if (needsVerification) {
    if (top.opportunityScore >= PRIMARY_PENDING_VERIFICATION_MIN_SCORE) {
      return {
        primaryOpportunityId: top.id,
        primaryProductId: top.productId,
        primaryRecommendationStatus: "PENDING_VERIFICATION",
        noRecommendationReasons: [],
      };
    }
    noRecommendationReasons.push(
      "Top opportunity requires verification and does not meet pending-verification threshold.",
    );
    return {
      primaryOpportunityId: null,
      primaryProductId: null,
      primaryRecommendationStatus: "NONE",
      noRecommendationReasons,
    };
  }

  if (!confOk) {
    if (top.opportunityScore >= PRIMARY_RECOMMENDATION_MIN_SCORE) {
      return {
        primaryOpportunityId: top.id,
        primaryProductId: top.productId,
        primaryRecommendationStatus: "PENDING_VERIFICATION",
        noRecommendationReasons: [],
      };
    }
    noRecommendationReasons.push(
      `Top opportunity confidence ${top.confidence} below confirmed minimum ${PRIMARY_CONFIRMED_MIN_CONFIDENCE}.`,
    );
    return {
      primaryOpportunityId: null,
      primaryProductId: null,
      primaryRecommendationStatus: "NONE",
      noRecommendationReasons,
    };
  }

  return {
    primaryOpportunityId: top.id,
    primaryProductId: top.productId,
    primaryRecommendationStatus: "CONFIRMED",
    noRecommendationReasons: [],
  };
}
