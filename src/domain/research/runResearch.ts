/**
 * On-demand clinic research workflow — extraction only, no gap analysis.
 */

import type { ClinicCapabilityProfile } from "./clinicCapabilityProfile";
import type { ClinicResearchContext } from "./clinicResearchContext";
import { computeSourceVersion } from "./clinicResearchContext";
import { buildProfileFromExtraction } from "./buildProfile";
import { reconcileWithDeterministicEvidence } from "./reconcile";
import type { ResearchProvider } from "@/providers/research/types";
import {
  getPersistedResearchProfile,
  persistResearchProfile,
  isResearchProfileStale,
} from "@/lib/researchPersistence";

export type RunClinicResearchResult =
  | { ok: true; profile: ClinicCapabilityProfile; cacheHit: boolean }
  | { ok: false; status: "FAILED" | "NOT_RESEARCHED"; error: string };

export async function runClinicResearch(
  provider: ResearchProvider,
  context: ClinicResearchContext,
): Promise<RunClinicResearchResult> {
  if (!provider.isEnabled()) {
    return {
      ok: false,
      status: "NOT_RESEARCHED",
      error: provider.getUnavailableReason() ?? "Research provider unavailable",
    };
  }

  const sourceVersion = computeSourceVersion(context.pages, context.promptVersion);
  const pageHashes = context.pages.map((p) => p.contentHash);

  const cached = await getPersistedResearchProfile(
    context.clinicId,
    sourceVersion,
    context.promptVersion,
  );
  if (cached && !isResearchProfileStale(cached, sourceVersion, context.promptVersion)) {
    return { ok: true, profile: { ...cached, researchStatus: "RESEARCHED" }, cacheHit: true };
  }

  const extraction = await provider.extract(context);
  if (!extraction.ok) {
    return { ok: false, status: "FAILED", error: extraction.error };
  }

  const { payload, notes } = reconcileWithDeterministicEvidence(
    extraction.payload,
    context.deterministicEvidence,
  );

  const needsVerification =
    notes.some((n) => n.resolution === "conflict_visible") ||
    payload.ambiguities.length > 0;

  const profile = buildProfileFromExtraction(context, payload, {
    provider: extraction.provider,
    model: extraction.model,
    researchStatus: needsVerification ? "NEEDS_VERIFICATION" : "RESEARCHED",
    reconciliationNotes: notes,
  });

  await persistResearchProfile(profile, pageHashes);
  return { ok: true, profile, cacheHit: extraction.cacheHit };
}
