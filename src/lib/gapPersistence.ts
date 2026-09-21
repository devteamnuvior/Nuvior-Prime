import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ProductGapAnalysis } from "@/domain/gap/productGapAnalysis";
import { PRODUCT_GAP_RULES_VERSION } from "@/domain/gap/productGapAnalysis";
import { gapAnalysisCacheKey } from "@/domain/gap/gapContext";

export function computeGapCacheKey(analysis: ProductGapAnalysis): string {
  return gapAnalysisCacheKey({
    profileVersion: analysis.profileVersion,
    catalogVersion: analysis.catalogVersion,
    gapRulesVersion: analysis.gapRulesVersion,
    crmContextHash: analysis.crmContextHash ?? "none",
  });
}

export async function getPersistedGapAnalysis(
  clinicId: string,
  cacheKey: string,
): Promise<ProductGapAnalysis | null> {
  try {
    const row = await prisma.productGapAnalysis.findUnique({ where: { clinicId } });
    if (!row) return null;
    if (row.cacheKey !== cacheKey) return null;
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;
    return row.analysisJson as unknown as ProductGapAnalysis;
  } catch {
    return null;
  }
}

export async function persistGapAnalysis(
  analysis: ProductGapAnalysis,
  ttlSeconds: number,
): Promise<void> {
  const cacheKey = computeGapCacheKey(analysis);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  try {
    await prisma.productGapAnalysis.upsert({
      where: { clinicId: analysis.clinicId },
      create: {
        clinicId: analysis.clinicId,
        cacheKey,
        profileVersion: analysis.profileVersion,
        catalogVersion: analysis.catalogVersion,
        gapRulesVersion: analysis.gapRulesVersion,
        crmContextHash: analysis.crmContextHash,
        analysisJson: analysis as object,
        analyzedAt: new Date(analysis.analyzedAt),
        expiresAt,
      },
      update: {
        cacheKey,
        profileVersion: analysis.profileVersion,
        catalogVersion: analysis.catalogVersion,
        gapRulesVersion: analysis.gapRulesVersion,
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

export function isGapAnalysisStale(
  stored: ProductGapAnalysis,
  profileVersion: string,
  catalogVersion: string,
  crmContextHash: string,
): boolean {
  return (
    stored.profileVersion !== profileVersion ||
    stored.catalogVersion !== catalogVersion ||
    stored.gapRulesVersion !== PRODUCT_GAP_RULES_VERSION ||
    stored.crmContextHash !== crmContextHash
  );
}

export function hashCacheKeyInput(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}
