/**
 * Server-side clinic intelligence service — catalog, CRM, page cache.
 */

import { prisma } from "@/lib/prisma";
import type { EnrichmentResult } from "@/domain/enrichment/types";
import type { GapCrmContext } from "@/domain/gap/gapContext";
import type { OpportunityCrmExtensions } from "@/domain/opportunity/opportunityContext";
import { buildClinicIntelligenceDto } from "@/domain/intelligence/buildClinicIntelligenceDto";
import {
  runClinicIntelligencePipeline,
  getCachedClinicIntelligence,
  type ClinicIntelligenceInput,
} from "@/domain/intelligence/runClinicIntelligence";
import type { ClinicIntelligenceDto } from "@/domain/intelligence/clinicIntelligenceDto";
import type { AppRoleName } from "@/domain/auth/permissions";
import type { CrmOverlaySnapshot } from "@/lib/prospecting";
import { getProductCatalogProvider } from "@/providers/productCatalog";
import { loadProductCatalogSnapshot } from "@/providers/productCatalog/cachedProductCatalogProvider";
import { getResearchProvider } from "@/providers/research";

export type ClinicIntelligenceRequest = {
  clinicId: string;
  businessName: string;
  provinceCode: string;
  segmentNumber: number;
  categoryLabel: string;
  websiteUrl: string | null;
  fitScore?: number | null;
  enrichment?: EnrichmentResult | null;
  crm?: CrmOverlaySnapshot | null;
  forceRefresh?: boolean;
  role: AppRoleName;
};

export function gapCrmFromOverlay(crm: CrmOverlaySnapshot | null | undefined): GapCrmContext {
  const dnc = crm?.doNotContact === true && crm?.dncVerified === true;
  return {
    doNotContact: dnc,
    formerMesoesteticCustomer: crm?.formerMesoesteticCustomer ?? false,
    hasAcademyAccount: crm?.hasAcademyAccount ?? false,
    aptosCertificationLevel: crm?.aptosCertificationLevel ?? null,
    historicalProductInterest: null,
    existingNuviorCustomer: Boolean(crm?.internalStatus && crm.applied),
    activeNuviorFamilies: [],
  };
}

export function opportunityCrmExtensionsFromOverlay(
  crm: CrmOverlaySnapshot | null | undefined,
): OpportunityCrmExtensions {
  return {
    revisitDue: Boolean(crm?.nextRevisitDueDate),
    dormantCustomer: crm?.lastOrderStatus === "dormant",
  };
}

export async function loadRawPagesForResearch(
  enrichment: EnrichmentResult | null | undefined,
  websiteUrl: string | null,
): Promise<{ url: string; title: string | null; bodyText: string; retrievedAt: string }[]> {
  const urls = new Set<string>();
  if (websiteUrl) urls.add(websiteUrl);
  for (const e of enrichment?.evidence ?? []) {
    if (e.sourceUrl) urls.add(e.sourceUrl);
  }

  const pages: { url: string; title: string | null; bodyText: string; retrievedAt: string }[] = [];
  for (const url of urls) {
    try {
      const row = await prisma.websitePageCache.findUnique({ where: { url } });
      if (row?.bodyText) {
        pages.push({
          url: row.url,
          title: row.sourceTitle,
          bodyText: row.bodyText,
          retrievedAt: row.fetchedAt.toISOString(),
        });
      }
    } catch {
      /* cache unavailable */
    }
  }
  return pages;
}

async function buildPipelineInput(req: ClinicIntelligenceRequest): Promise<ClinicIntelligenceInput> {
  const catalogProvider = getProductCatalogProvider();
  const snapshot = await loadProductCatalogSnapshot(catalogProvider);
  const rawPages = await loadRawPagesForResearch(req.enrichment, req.websiteUrl);

  return {
    clinicId: req.clinicId,
    businessName: req.businessName,
    provinceCode: req.provinceCode,
    segmentNumber: req.segmentNumber,
    categoryLabel: req.categoryLabel,
    websiteUrl: req.websiteUrl,
    enrichment: req.enrichment ?? null,
    rawPages,
    crm: gapCrmFromOverlay(req.crm),
    crmExtensions: opportunityCrmExtensionsFromOverlay(req.crm),
    accountFitScore: req.fitScore ?? null,
    catalog: snapshot.products,
    catalogVersion: snapshot.metadata.catalogVersion,
    forceRefresh: req.forceRefresh,
  };
}

export async function fetchClinicIntelligence(
  req: ClinicIntelligenceRequest,
): Promise<ClinicIntelligenceDto> {
  const input = await buildPipelineInput(req);
  return getCachedClinicIntelligence({ ...input, role: req.role });
}

export async function runClinicIntelligenceResearch(
  req: ClinicIntelligenceRequest,
): Promise<{ ok: boolean; dto: ClinicIntelligenceDto; error?: string }> {
  const input = await buildPipelineInput(req);
  const provider = getResearchProvider();
  const result = await runClinicIntelligencePipeline(provider, input);

  const dto = buildClinicIntelligenceDto({
    profile: result.ok ? result.profile : null,
    gapAnalysis: result.ok ? result.gapAnalysis : null,
    opportunityAnalysis: result.ok ? result.opportunityAnalysis : null,
    catalog: input.catalog,
    role: req.role,
    accountFitScore: input.accountFitScore ?? null,
    researchState: result.dto.researchState,
    failureMessage: result.ok ? null : result.error,
    canRefresh: result.ok,
  });

  if (!result.ok) {
    return { ok: false, dto, error: result.error };
  }
  return { ok: true, dto };
}
