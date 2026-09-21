/**
 * Build rep-safe clinic intelligence DTO from Stage C/D/E outputs.
 */

import type { AppRoleName } from "@/domain/auth/permissions";
import { crmVisibilityForRole } from "@/domain/auth/permissions";
import type { ProductGap } from "@/domain/gap/productGapAnalysis";
import { PRODUCT_GAP_RULES_VERSION } from "@/domain/gap/productGapAnalysis";
import type { ProductOpportunityAnalysis } from "@/domain/opportunity/productOpportunityAnalysis";
import type { NuviorProduct } from "@/domain/products/nuviorProduct";
import type { ClinicCapabilityProfile, ProfileItem } from "@/domain/research/clinicCapabilityProfile";
import { CLINIC_RESEARCH_PROMPT_VERSION } from "@/domain/research/clinicCapabilityProfile";
import { PRODUCT_OPPORTUNITY_SCORING_VERSION } from "@/domain/opportunity/scoringConfig";
import type {
  BriefIntelligenceSections,
  ClinicIntelligenceDto,
  EvidenceItem,
  OfferingItem,
  OpportunityGapItem,
  PrimaryOpportunityView,
  SecondaryOpportunityView,
} from "./clinicIntelligenceDto";
import {
  capabilityLabel,
  inventoryStateLabel,
  opportunityHeadline,
  secondaryOpportunityHeadline,
} from "./labels";

function isRecommendableProduct(product: NuviorProduct | undefined): boolean {
  if (!product) return false;
  if (product.productFamily === "MESOESTETIC") return false;
  return product.recommendable && product.active && product.sellable;
}

function dedupeOfferings(items: ProfileItem[], category: OfferingItem["category"]): OfferingItem[] {
  const seen = new Set<string>();
  const out: OfferingItem[] = [];
  for (const item of items) {
    const key = `${category}:${item.normalizedValue.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label: item.normalizedValue,
      inventoryStateLabel: inventoryStateLabel(item.inventoryState),
      category,
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export function buildOfferings(profile: ClinicCapabilityProfile): OfferingItem[] {
  return [
    ...dedupeOfferings(profile.services, "service"),
    ...dedupeOfferings(profile.brands, "brand"),
    ...dedupeOfferings(profile.capabilities, "capability"),
    ...dedupeOfferings(profile.devices, "device"),
  ];
}

function formatGapWhyItMatters(gap: ProductGap): string {
  const adj = gap.explanationData.adjacentSignals;
  const present = gap.explanationData.presentCapabilities;
  if (adj.length > 0) {
    return `The clinic already offers ${adj.slice(0, 3).join(", ")}, making this relevant to verify.`;
  }
  if (present.length > 0) {
    const labels = present.slice(0, 3).map((c) => capabilityLabel(c).toLowerCase());
    return `The clinic already offers adjacent ${labels.join(", ")} services, making this relevant to verify.`;
  }
  if (gap.gapType === "RETENTION_GAP") {
    return "Former Mesoestetic context may support a Dermaceutic retention conversation.";
  }
  if (gap.gapType === "TRAINING_GAP") {
    return "Training or certification gap detected from clinic profile and CRM signals.";
  }
  return "Gap detected from reviewed clinic profile — confirm on visit.";
}

export function primaryGapFromOpportunity(
  opportunityAnalysis: ProductOpportunityAnalysis,
  gapById: Map<string, ProductGap>,
): OpportunityGapItem | null {
  const primary = opportunityAnalysis.opportunities.find((o) => o.isPrimary);
  if (!primary) return null;

  const related = primary.relatedGapIds
    .map((id) => gapById.get(id))
    .filter(Boolean) as ProductGap[];
  const gap =
    related.find((g) => g.verificationRequired) ??
    related.find((g) => g.clinicInventoryState === "NOT_FOUND") ??
    related[0];
  if (!gap) return null;

  return {
    capabilityLabel: capabilityLabel(gap.capability ?? gap.explanationData.targetCapability),
    inventoryStateLabel: gap.clinicInventoryState
      ? inventoryStateLabel(gap.clinicInventoryState)
      : "Unknown",
    whyItMatters: formatGapWhyItMatters(gap),
  };
}

function buildWhyReasons(
  profile: ClinicCapabilityProfile,
  primaryGap: OpportunityGapItem | null,
): string[] {
  const reasons: string[] = [];

  const md = profile.practitionerTypes.some((p) =>
    /physician|md|doctor|np/.test(p.normalizedValue.toLowerCase()),
  );
  if (md) reasons.push("Physician-led medical aesthetics clinic");

  for (const cap of profile.capabilities) {
    if (cap.inventoryState !== "CONFIRMED_PRESENT") continue;
    const label = capabilityLabel(cap.capabilityTag ?? cap.normalizedValue);
    reasons.push(`${label} confirmed`);
    if (reasons.length >= 3) break;
  }

  for (const svc of profile.services) {
    if (svc.inventoryState !== "CONFIRMED_PRESENT") continue;
    if (reasons.some((r) => r.toLowerCase().includes(svc.normalizedValue.toLowerCase()))) continue;
    reasons.push(`${svc.normalizedValue} confirmed`);
    if (reasons.length >= 4) break;
  }

  if (primaryGap && primaryGap.inventoryStateLabel === "Not found on reviewed pages") {
    const line = `${primaryGap.capabilityLabel} not found on reviewed pages`;
    if (!reasons.some((r) => r.toLowerCase() === line.toLowerCase())) {
      reasons.push(line);
    }
  }

  return reasons.slice(0, 4);
}

function buildEvidenceItems(
  profile: ClinicCapabilityProfile,
  opportunityAnalysis: ProductOpportunityAnalysis,
  itemByEvidenceId: Map<string, string>,
): EvidenceItem[] {
  const refs = new Map<string, EvidenceItem>();
  for (const ref of [...profile.evidenceRefs, ...opportunityAnalysis.evidenceRefs]) {
    if (refs.has(ref.id)) continue;
    let sourcePage: string | null = null;
    if (ref.sourceUrl) {
      try {
        const u = new URL(ref.sourceUrl);
        sourcePage = u.pathname === "/" ? u.hostname : u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
      } catch {
        sourcePage = ref.sourceUrl;
      }
    }
    refs.set(ref.id, {
      id: ref.id,
      sourcePage,
      url: ref.sourceUrl,
      snippet: ref.snippet,
      extractedItem: itemByEvidenceId.get(ref.id) ?? null,
      confidence: ref.confidence,
      retrievedAt: ref.retrievedAt,
    });
  }
  return [...refs.values()];
}

function itemEvidenceIndex(profile: ClinicCapabilityProfile): Map<string, string> {
  const map = new Map<string, string>();
  const all = [
    ...profile.services,
    ...profile.brands,
    ...profile.capabilities,
    ...profile.devices,
    ...profile.practitioners,
  ];
  for (const item of all) {
    for (const id of item.evidenceRefIds) {
      map.set(id, item.normalizedValue);
    }
  }
  return map;
}

export function buildClinicIntelligenceDto(input: {
  profile: ClinicCapabilityProfile | null;
  gapAnalysis: import("@/domain/gap/productGapAnalysis").ProductGapAnalysis | null;
  opportunityAnalysis: ProductOpportunityAnalysis | null;
  catalog: NuviorProduct[];
  role: AppRoleName;
  accountFitScore: number | null;
  researchState: ClinicIntelligenceDto["researchState"];
  failureMessage?: string | null;
  canRefresh?: boolean;
}): ClinicIntelligenceDto {
  const visibility = crmVisibilityForRole(input.role);
  const showDiagnostics = visibility === "manager" || visibility === "admin";

  const catalogById = new Map(input.catalog.map((p) => [p.id, p]));
  const gapById = new Map((input.gapAnalysis?.gaps ?? []).map((g) => [g.id, g]));

  const blockedDnc =
    input.opportunityAnalysis?.primaryRecommendationStatus === "BLOCKED_DNC" ||
    (input.gapAnalysis?.gaps.some((g) => g.eligibilityState === "BLOCKED_DNC") ?? false);

  let primary: PrimaryOpportunityView | null = null;
  let secondaryOpportunities: SecondaryOpportunityView[] = [];
  let noRecommendationMessage: string | null = null;
  let evidence: EvidenceItem[] = [];
  let offerings: OfferingItem[] = [];

  if (input.profile) {
    offerings = buildOfferings(input.profile);
    const itemIndex = itemEvidenceIndex(input.profile);
    evidence = input.opportunityAnalysis
      ? buildEvidenceItems(input.profile, input.opportunityAnalysis, itemIndex)
      : buildEvidenceItems(
          input.profile,
          {
            evidenceRefs: input.profile.evidenceRefs,
          } as ProductOpportunityAnalysis,
          itemIndex,
        );
  }

  if (input.opportunityAnalysis) {
    const { primaryProductId, primaryRecommendationStatus, noRecommendationReasons } =
      input.opportunityAnalysis;

    if (primaryRecommendationStatus === "NONE") {
      noRecommendationMessage =
        noRecommendationReasons[0] ?? "No clear product opportunity yet for this clinic.";
    } else if (primaryRecommendationStatus === "BLOCKED_DNC") {
      noRecommendationMessage =
        "Do-not-contact — no actionable sales recommendation. Opportunities are informational only.";
    }

    const primaryOpp = input.opportunityAnalysis.opportunities.find((o) => o.isPrimary);
    if (primaryOpp && primaryProductId && isRecommendableProduct(catalogById.get(primaryProductId))) {
      const product = catalogById.get(primaryProductId)!;
      const gap = primaryGapFromOpportunity(input.opportunityAnalysis, gapById);
      primary = {
        productId: product.id,
        productName: product.name,
        headline: opportunityHeadline(primaryRecommendationStatus, primaryOpp.scoreBand),
        recommendationStatus: primaryRecommendationStatus,
        whyReasons: buildWhyReasons(input.profile!, gap),
        verifyQuestion: primaryOpp.verificationQuestions[0] ?? null,
        gap,
        openingAngle: product.approvedPositioning,
      };
    }

    secondaryOpportunities = input.opportunityAnalysis.opportunities
      .filter((o) => !o.isPrimary && o.eligibilityState === "ELIGIBLE")
      .filter((o) => isRecommendableProduct(catalogById.get(o.productId)))
      .slice(0, 5)
      .map((o) => {
        const product = catalogById.get(o.productId)!;
        return {
          productId: product.id,
          productName: product.name,
          headline: secondaryOpportunityHeadline(o.scoreBand),
        };
      });
  }

  let diagnostics: ClinicIntelligenceDto["diagnostics"] = null;
  if (showDiagnostics && input.opportunityAnalysis && input.profile) {
    const primaryOpp = input.opportunityAnalysis.opportunities.find((o) => o.isPrimary);
    if (primaryOpp) {
      diagnostics = {
        opportunityScore: primaryOpp.opportunityScore,
        scoreBand: primaryOpp.scoreBand,
        scoreComponents: primaryOpp.scoreComponents,
        confidence: primaryOpp.confidence,
        profileVersion: input.gapAnalysis?.profileVersion ?? input.profile.sourceVersion,
        gapRulesVersion: input.gapAnalysis?.gapRulesVersion ?? PRODUCT_GAP_RULES_VERSION,
        scoringVersion: input.opportunityAnalysis.scoringRulesVersion,
        catalogVersion: input.opportunityAnalysis.catalogVersion,
        researchProvider: input.profile.provider,
        researchModel: input.profile.model,
      };
    }
  }

  return {
    clinicId: input.profile?.clinicId ?? input.opportunityAnalysis?.clinicId ?? "",
    researchState: input.researchState,
    researchedAt: input.profile?.researchedAt ?? null,
    accountFitScore: input.accountFitScore,
    offerings,
    primary,
    secondaryOpportunities,
    blockedDnc,
    noRecommendationMessage,
    failureMessage: input.failureMessage ?? null,
    evidence,
    diagnostics,
    canRefresh: input.canRefresh ?? Boolean(input.profile),
  };
}

export function buildBriefIntelligenceSections(
  dto: ClinicIntelligenceDto,
  businessName: string,
  categoryLabel: string,
  segmentNumber: number,
): BriefIntelligenceSections {
  const watchOuts: string[] = [];
  if (dto.primary?.recommendationStatus === "PENDING_VERIFICATION") {
    watchOuts.push("Verify the primary opportunity on site before pitching product placement.");
  }
  if (dto.blockedDnc) {
    watchOuts.push("Do-not-contact account — do not pursue sales conversation.");
  }
  if (dto.researchState === "NEEDS_VERIFICATION") {
    watchOuts.push("Research profile has items needing on-site verification.");
  }

  const gapSummary = dto.primary?.gap
    ? `${dto.primary.gap.capabilityLabel} — ${dto.primary.gap.inventoryStateLabel}. ${dto.primary.gap.whyItMatters}`
    : null;

  return {
    lockedFromOpportunityEngine: Boolean(dto.primary?.productName),
    clinicSnapshot: [
      `${businessName} — Segment ${segmentNumber}: ${categoryLabel}.`,
      dto.offerings.length > 0
        ? `Reviewed offerings: ${dto.offerings
            .filter((o) => o.inventoryStateLabel === "Confirmed on website")
            .slice(0, 6)
            .map((o) => o.label)
            .join(", ") || "limited public signals"}.`
        : "Limited public service menu — confirm on site.",
    ],
    accountFitLine:
      dto.accountFitScore != null ? `Account fit score: ${dto.accountFitScore}/5` : null,
    whatTheyAppearToOffer: dto.offerings.map(
      (o) => `${o.label} (${o.inventoryStateLabel.toLowerCase()})`,
    ),
    bestOpportunity: dto.primary
      ? {
          productName: dto.primary.productName,
          headline: dto.primary.headline,
          status: dto.primary.recommendationStatus,
        }
      : null,
    whyReasons: dto.primary?.whyReasons ?? [],
    gapSummary,
    verifyQuestion: dto.primary?.verifyQuestion ?? null,
    openingAngle: dto.primary?.openingAngle ?? null,
    watchOuts,
  };
}

/** Empty DTO for not-yet-researched clinics. */
export function emptyClinicIntelligenceDto(
  clinicId: string,
  accountFitScore: number | null,
): ClinicIntelligenceDto {
  return {
    clinicId,
    researchState: "NOT_RESEARCHED",
    researchedAt: null,
    accountFitScore,
    offerings: [],
    primary: null,
    secondaryOpportunities: [],
    blockedDnc: false,
    noRecommendationMessage: null,
    failureMessage: null,
    evidence: [],
    diagnostics: null,
    canRefresh: false,
  };
}

export const INTELLIGENCE_VERSION_MARKERS = {
  promptVersion: CLINIC_RESEARCH_PROMPT_VERSION,
  gapRulesVersion: PRODUCT_GAP_RULES_VERSION,
  scoringVersion: PRODUCT_OPPORTUNITY_SCORING_VERSION,
} as const;
