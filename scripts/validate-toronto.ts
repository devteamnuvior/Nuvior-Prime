/**
 * Toronto validation — Phase 4 CRM overlay + discovery + enrichment.
 *
 *   PLACES_PROVIDER=mock ENRICHMENT_MAX_ACCOUNTS=5 CRM_PROVIDER=mock npm run validate:toronto
 */

import { runProspectSearch } from "../src/lib/prospecting";

async function main() {
  process.env.ENRICHMENT_ENABLED = process.env.ENRICHMENT_ENABLED ?? "true";
  process.env.ENRICHMENT_MAX_ACCOUNTS = process.env.ENRICHMENT_MAX_ACCOUNTS ?? "5";
  process.env.CRM_PROVIDER = process.env.CRM_PROVIDER ?? "mock";
  process.env.LLM_PROVIDER = process.env.LLM_PROVIDER ?? "mock";

  const provider = process.env.PLACES_PROVIDER ?? "mock";
  console.log("=== NUVIOR Prime — Toronto validation (Phase 5) ===");
  console.log(`PLACES_PROVIDER=${provider}`);
  console.log(`CRM_PROVIDER=${process.env.CRM_PROVIDER}`);
  console.log(`LLM_PROVIDER=${process.env.LLM_PROVIDER}`);
  console.log(
    `ENRICHMENT_ENABLED=${process.env.ENRICHMENT_ENABLED} MAX_ACCOUNTS=${process.env.ENRICHMENT_MAX_ACCOUNTS}`,
  );
  console.log("Start: M5V 2T6 · ON · target 20 · radius 40 km · min fit 3\n");

  const result = await runProspectSearch({
    provinceCode: "ON",
    startQuery: "M5V 2T6",
    dailyVisitTarget: 20,
    maxRadiusKm: 40,
    minFitScore: 3,
    alreadyVisitedRaw: "none",
    revisitsDueRaw: "none",
  });

  if (!result.ok) {
    console.error("FAILED:", result.error);
    process.exit(1);
  }

  console.log("Providers:", {
    places: result.placesProvider,
    crm: result.crmProvider,
    crmUnavailable: result.crmUnavailable,
    enrichment: result.enrichmentProvider,
    llm: result.llm,
    visitRunId: result.visitRunId,
  });
  console.log("Discovery:", {
    discovered: result.discovery.discoveredCount,
    afterDedupe: result.discovery.afterDedupCount,
    inTaxonomy: result.discovery.classifiedInTaxonomyCount,
    qualified: result.qualifiedCount,
    radiusReachedKm: result.discovery.radiusReachedKm,
    stoppedReason: result.discovery.stoppedReason,
  });
  console.log("Enrichment:", result.enrichment);
  console.log("DNC excluded:", result.result.excludedDoNotContact);
  console.log("Already-visited excluded:", result.result.excludedAlreadyVisited);
  console.log("Matching queue:", result.matchingQueue.length);
  console.log("Verification queue items:", result.verificationQueue.length);

  console.log("\n=== Per-account (visit list + CRM overlay) ===");
  for (const e of result.result.presentationEntries) {
    const enr = result.enrichmentByAccountId[e.accountId];
    const origins = result.fieldOriginsByAccountId[e.accountId];
    const crm = result.crmByAccountId[e.accountId];
    console.log("\n---");
    console.log(`Identity (Places): ${e.businessName} [${e.accountId}]`);
    console.log(`Address (Places): ${e.streetAddress}, ${e.city} ${e.postalCode}`);
    console.log(
      `CRM match: state=${crm?.match.state} method=${crm?.match.method} conf=${crm?.match.confidence.toFixed(2)} applied=${crm?.applied}`,
    );
    console.log(`CRM ID: ${crm?.crmExternalId ?? "—"}`);
    console.log(`DNC (CRM): ${crm?.doNotContact ?? "unverified"} · ${crm?.dncDebug}`);
    console.log(
      `Academy/Cert (CRM): academy=${crm?.hasAcademyAccount} level=${crm?.aptosCertificationLevel ?? "—"} pathway=${crm?.aptosPathway ?? "—"}`,
    );
    console.log(`Former Mesoestetic (CRM): ${crm?.formerMesoesteticCustomer ?? "—"}`);
    console.log(
      `Last order (CRM/derived): ${crm?.lastOrderDate ?? "never"} → ${crm?.lastOrderStatus ?? "—"}`,
    );
    console.log(
      `Revisit (CRM): lastVisit=${crm?.lastVisitDate ?? "—"} due=${crm?.nextRevisitDueDate ?? "—"} listFlag=${e.isRevisit ? "RE-VISIT" : "no"}`,
    );
    console.log(
      `Final: INCLUDED fit=${e.fitScore} lead=${e.leadProductLabel}${e.isRevisit ? " RE-VISIT" : ""}`,
    );
    const brief = result.briefByAccountId[e.accountId];
    console.log(
      `Brief: generator=${brief?.generator} leadLocked=${brief?.leadProductForVisit} summary=${(brief?.accountSummary ?? "").slice(0, 120)}`,
    );
    console.log(`Website evidence: ${enr?.website ?? "UNKNOWN / not enriched"}`);
    console.log(
      "Sources — Places:",
      origins?.googleFields?.slice(0, 4).join(", "),
    );
    console.log("Sources — CRM:", origins?.crmFields?.join(" | "));
    console.log("Sources — Derived:", origins?.derivedFields?.slice(0, 2).join(" | "));
    console.log(
      "Sources — Website:",
      (origins?.enrichedFields ?? []).slice(0, 3).join("; ") || "(none in cap)",
    );
  }

  console.log("\n=== Exclusions (not visit rows) ===");
  for (const name of result.result.excludedDoNotContact) {
    console.log(`EXCLUDED DNC: ${name}`);
  }
  for (const name of result.result.excludedAlreadyVisited) {
    console.log(`EXCLUDED already-visited: ${name}`);
  }
  for (const line of result.result.excludedDebug) {
    console.log(`DEBUG: ${line}`);
  }

  console.log(
    "\nReminder: CRM owns DNC/orders/certs/visits; Places owns geo/ratings; website owns public clinical evidence; derived owns fit/lead. Mesoestetic never lead.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
