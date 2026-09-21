/**
 * Individual gap-type evaluators — deterministic rules only.
 */

import { isProductRecommendable } from "@/domain/products/eligibility";
import { evaluateScopeOfPractice } from "@/domain/scopeOfPractice";
import {
  ADJACENCY_RULES,
  RETENTION_FAMILY,
  TRAINING_GAP_RULE,
} from "./adjacencyRules";
import type { GapAnalysisInput } from "./gapContext";
import {
  collectEvidenceForCapability,
  getCapabilityState,
  hasAdjacentKeywordSignal,
  type ProfileInventory,
} from "./profileInventory";
import type { GapEligibilityState, ProductGap } from "./productGapAnalysis";
import { verificationQuestionFor } from "./verificationQuestions";
import { buildAdjacencyGap } from "./buildAdjacencyGap";
import { buildProductLineGap } from "./buildProductLineGap";
import {
  gapId,
  resolveFamilyProductIds,
} from "./gapHelpers";

export function evaluateCapabilityGaps(
  inventory: ProfileInventory,
  input: GapAnalysisInput,
): ProductGap[] {
  const gaps: ProductGap[] = [];
  for (const rule of ADJACENCY_RULES) {
    if (!rule.allowedGapTypes.includes("CAPABILITY_GAP")) continue;
    if (getCapabilityState(inventory, rule.targetCapability) === "CONFIRMED_PRESENT") continue;
    const gap = buildAdjacencyGap(rule, inventory, input, "CAPABILITY_GAP");
    if (gap) gaps.push(gap);
  }
  return gaps;
}

export function evaluateProductLineGaps(
  inventory: ProfileInventory,
  input: GapAnalysisInput,
): ProductGap[] {
  const gaps: ProductGap[] = [];
  for (const rule of ADJACENCY_RULES) {
    if (!rule.allowedGapTypes.includes("PRODUCT_LINE_GAP")) continue;
    const gap = buildProductLineGap(rule, inventory, input);
    if (gap) gaps.push(gap);
  }
  return gaps;
}

export function evaluateRetentionGap(input: GapAnalysisInput): ProductGap | null {
  if (!input.crm.formerMesoesteticCustomer) return null;
  const productResolution = resolveFamilyProductIds(
    input.catalog,
    RETENTION_FAMILY.productFamily,
    RETENTION_FAMILY.primaryProductId,
    input,
    false,
  );
  if (productResolution.productIds.length === 0) return null;

  let eligibilityState: GapEligibilityState = productResolution.eligibility;
  const blockingReasons = [...productResolution.blockingReasons];
  if (input.crm.doNotContact) {
    eligibilityState = "BLOCKED_DNC";
    blockingReasons.push("Account is do-not-contact — retention gap is informational only.");
  }

  return {
    id: gapId([input.profile.clinicId, "RETENTION_GAP", RETENTION_FAMILY.primaryProductId]),
    gapType: "RETENTION_GAP",
    capability: RETENTION_FAMILY.capability,
    relevantProductIds: productResolution.productIds,
    clinicInventoryState: null,
    evidenceRefIds: [],
    confidence: "HIGH",
    reasonCode: "FORMER_MESOESTETIC_CUSTOMER",
    explanationData: {
      gapType: "RETENTION_GAP",
      targetCapability: RETENTION_FAMILY.capability,
      adjacentCapabilities: [],
      adjacentSignals: [],
      presentCapabilities: [],
      targetState: null,
      adjacencyRuleId: null,
      productFamily: RETENTION_FAMILY.productFamily,
      eligibilityConfirmed: eligibilityState === "ELIGIBLE",
      crmTrigger: RETENTION_FAMILY.trigger,
    },
    verificationRequired: false,
    verificationQuestion: verificationQuestionFor(RETENTION_FAMILY.capability, "RETENTION_GAP", null),
    eligibilityState,
    blockingReasons,
  };
}

export function evaluateTrainingGap(
  inventory: ProfileInventory,
  input: GapAnalysisInput,
): ProductGap | null {
  const hasCert =
    Boolean(input.crm.aptosCertificationLevel && input.crm.aptosCertificationLevel !== "NONE") ||
    input.crm.hasAcademyAccount;
  if (hasCert) return null;

  const threadState = getCapabilityState(inventory, TRAINING_GAP_RULE.threadCapability);
  const injectableAdjacency = hasAdjacentKeywordSignal(inventory, [
    "botox",
    "filler",
    "injectable",
    "facial aesthetics",
  ]);
  const scope = evaluateScopeOfPractice(input.provinceCode, input.credentials);
  if (!scope.aptosCertificationLeadOk) return null;
  if (threadState === "CONFIRMED_PRESENT") return null;
  if (!injectableAdjacency && !input.credentials.hasPhysicianOrNp) return null;

  const certProduct = input.catalog.find(
    (p) => p.id === TRAINING_GAP_RULE.certificationProductIds[0],
  );
  if (!certProduct) return null;

  const rec = isProductRecommendable(certProduct, {
    provinceCode: input.provinceCode,
    credentials: input.credentials,
    allowTrainingProducts: true,
  });
  if (!rec.eligible) return null;

  let eligibilityState: GapEligibilityState = "ELIGIBLE";
  const blockingReasons: string[] = [];
  if (input.crm.doNotContact) {
    eligibilityState = "BLOCKED_DNC";
    blockingReasons.push("Account is do-not-contact.");
  }

  return {
    id: gapId([input.profile.clinicId, "TRAINING_GAP", certProduct.id]),
    gapType: "TRAINING_GAP",
    capability: TRAINING_GAP_RULE.targetCapability,
    relevantProductIds: [certProduct.id],
    clinicInventoryState: threadState,
    evidenceRefIds: collectEvidenceForCapability(inventory, TRAINING_GAP_RULE.threadCapability),
    confidence: injectableAdjacency ? "MEDIUM" : "LOW",
    reasonCode: "MISSING_APTOS_CERTIFICATION",
    explanationData: {
      gapType: "TRAINING_GAP",
      targetCapability: TRAINING_GAP_RULE.targetCapability,
      adjacentCapabilities: inventory.presentCapabilities,
      adjacentSignals: injectableAdjacency ? ["injectables"] : [],
      presentCapabilities: inventory.presentCapabilities,
      targetState: threadState,
      adjacencyRuleId: TRAINING_GAP_RULE.id,
      productFamily: TRAINING_GAP_RULE.productFamily,
      eligibilityConfirmed: eligibilityState === "ELIGIBLE",
      crmTrigger: "missing_aptos_certification",
    },
    verificationRequired: true,
    verificationQuestion: verificationQuestionFor(
      TRAINING_GAP_RULE.targetCapability,
      "TRAINING_GAP",
      threadState,
    ),
    eligibilityState,
    blockingReasons,
  };
}

export function evaluateCrossSellGaps(
  existingGaps: ProductGap[],
  input: GapAnalysisInput,
): ProductGap[] {
  if (!input.crm.existingNuviorCustomer) return [];
  return existingGaps
    .filter(
      (g) =>
        g.gapType === "CAPABILITY_GAP" &&
        g.eligibilityState === "ELIGIBLE" &&
        !input.crm.activeNuviorFamilies.includes(g.explanationData.productFamily ?? ""),
    )
    .map((g) => ({
      ...g,
      id: gapId([input.profile.clinicId, "CROSS_SELL", g.id]),
      gapType: "CROSS_SELL_OPPORTUNITY" as const,
      reasonCode: "EXISTING_NUVIOR_CUSTOMER_ADJACENT",
      explanationData: {
        ...g.explanationData,
        gapType: "CROSS_SELL_OPPORTUNITY",
        crmTrigger: "existing_nuvior_customer",
      },
      verificationQuestion:
        g.verificationQuestion ??
        verificationQuestionFor(g.capability, "CROSS_SELL_OPPORTUNITY", g.clinicInventoryState),
    }));
}
