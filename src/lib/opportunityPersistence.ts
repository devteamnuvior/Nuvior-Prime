import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ProductOpportunityAnalysis } from "@/domain/opportunity/productOpportunityAnalysis";
import { PRODUCT_OPPORTUNITY_SCORING_VERSION } from "@/domain/opportunity/scoringConfig";
import { opportunityAnalysisCacheKey } from "@/domain/opportunity/opportunityContext";

export function computeOpportunityCacheKey(analysis: ProductOpportunityAnalysis): string {
  return opportunityAnalysisCacheKey({
    gapAnalysisVersion: analysis.gapAnalysisVersion,
    catalogVersion: analysis.catalogVersion,
    scoringRulesVersion: analysis.scoringRulesVersion,
    crmContextHash: analysis.crmContextHash ?? "none",
  });
}

export async function getPersistedOpportunityAnalysis(
  clinicId: string,
  cacheKey: string,
): Promise<ProductOpportunityAnalysis | null> {
  try {
    const row = await prisma.productOpportunityAnalysis.findUnique({ where: { clinicId } });
    if (!row) return null;
    if (row.cacheKey !== cacheKey) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
    return row.analysisJson as unknown as ProductOpportunityAnalysis;
  } catch {
    return null;
  }
}

export async function persistOpportunityAnalysis(
  analysis: ProductOpportunityAnalysis,
  ttlSeconds: number,
): Promise<void> {
  const cacheKey = computeOpportunityCacheKey(analysis);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  try {
    await prisma.productOpportunityAnalysis.upsert({
      where: { clinicId: analysis.clinicId },
      create: {
        clinicId: analysis.clinicId,
        cacheKey,
        gapAnalysisVersion: analysis.gapAnalysisVersion,
        catalogVersion: analysis.catalogVersion,
        scoringRulesVersion: analysis.scoringRulesVersion,
        crmContextHash: analysis.crmContextHash,
        analysisJson: analysis as object,
        analyzedAt: new Date(analysis.analyzedAt),
        expiresAt,
      },
      update: {
        cacheKey,
        gapAnalysisVersion: analysis.gapAnalysisVersion,
        catalogVersion: analysis.catalogVersion,
        scoringRulesVersion: analysis.scoringRulesVersion,
        crmContextHash: analysis.crmContextHash,
        analysisJson: analysis as object,
        analyzedAt: new Date(analysis.analyzedAt),
        expiresAt,
      },
    });
  } catch {
    // Best-effort when DB unavailable
  }
}

export function isOpportunityAnalysisStale(
  stored: ProductOpportunityAnalysis,
  gapAnalysisVersion: string,
  catalogVersion: string,
  crmContextHash: string,
): boolean {
  return (
    stored.gapAnalysisVersion !== gapAnalysisVersion ||
    stored.catalogVersion !== catalogVersion ||
    stored.scoringRulesVersion !== PRODUCT_OPPORTUNITY_SCORING_VERSION ||
    stored.crmContextHash !== crmContextHash
  );
}

export function hashOpportunityInput(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}
