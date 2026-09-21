import {
  ORGANIZATION_TYPE_LABELS,
  CERTIFICATION_PATHWAY_LABELS,
  UNKNOWN_VERIFY,
} from "@/domain/terminology";
import { generatePreVisitBrief, type PreVisitBriefPayload } from "@/domain/brief";
import {
  buildDailyVisitList,
  parseAccountNameList,
  type ProspectCandidate,
  type VisitListResult,
} from "@/domain/visitList";
import { discoverPlaces, type DiscoveryStats } from "@/domain/discovery";
import { getCrmProvider, getEnrichmentProvider, getPlacesProvider, getLlmProvider, getRoutingProvider } from "@/providers";
import { planVisitRoute, type RoutePlanSummary } from "@/domain/routing/optimize";
import { getRoutingConfig } from "@/domain/routing/config";
import type { PlannedRouteStop } from "@/domain/routing/optimize";
import { pointInWorkingArea } from "@/domain/geo/workingArea";
import { getLlmConfig } from "@/lib/llmConfig";
import {
  mergeBriefWithNarrative,
  synthesizeBriefNarrative,
  withTemplateFallback,
} from "@/domain/llm/synthesize";
import type { SynthesisContext, EvidenceSnippet } from "@/domain/llm/lockedFacts";
import { seasonFromDate, seasonalPitchOrder } from "@/domain/brief";
import { SEASON_LABELS } from "@/domain/terminology";
import { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";
import type { ClassificationResult } from "@/domain/classifyPlace";
import type { RawPlace } from "@/providers/places/types";
import { getEnrichmentConfig } from "@/lib/enrichmentConfig";
import type { EnrichmentResult, VerificationItem } from "@/domain/enrichment/types";
import {
  mergeCredentials,
  preferEnriched,
  signalsFromEnrichment,
} from "@/domain/enrichment/qualificationSignals";
import { mockWebsiteForPlace } from "@/providers/enrichment/mockWebsiteFixtures";
import type { EvidenceRecord } from "@/domain/enrichment/types";
import {
  matchPublicToCrm,
  shouldAutoApplyMatch,
  type MatchResult,
} from "@/domain/crm/matching";
import { evaluateDnc } from "@/domain/crm/dnc";
import { deriveLastOrderStatus, type LastOrderStatus } from "@/domain/crm/lastOrder";
import { loadPersistedMappings } from "@/lib/crmMappings";
import { persistVisitRun } from "@/lib/visitPersistence";
import type { CrmAccountStatus, CrmInternalAccount } from "@/providers/crm/types";
import { MOCK_CRM_AS_OF } from "@/providers/crm/mockCrmProvider";

export type ProspectSearchInput = {
  provinceCode: string;
  startQuery: string;
  /**
   * Phase 8.6 — client-selected start (Google Places result, dropped pin, or
   * browser geolocation). When present, server geocoding is skipped and these
   * exact coordinates are used.
   */
  startCoords?: { lat: number; lng: number } | null;
  startPlaceId?: string | null;
  startLabel?: string | null;
  /** Phase 8.6 — rep-drawn working area; candidates outside are excluded before qualification. */
  workingArea?: { lat: number; lng: number }[] | null;
  dailyVisitTarget: number;
  maxRadiusKm: number;
  /** Optional hard one-way drive-time limit (minutes). Null/omit = not enforced. */
  maxDriveMinutes?: number | null;
  dayStartClock?: string | null;
  dayEndClock?: string | null;
  minFitScore: number;
  alreadyVisitedRaw: string;
  revisitsDueRaw: string;
  /** Phase 6 — authenticated actor for visit-run ownership */
  actorUserId?: string | null;
  actorDisplayName?: string | null;
};

export type CrmOverlaySnapshot = {
  match: MatchResult;
  applied: boolean;
  crmExternalId: string | null;
  internalStatus: string | null;
  hasAcademyAccount: boolean | null;
  aptosCertificationLevel: string | null;
  aptosPathway: string | null;
  formerMesoesteticCustomer: boolean | null;
  lastOrderDate: string | null;
  lastOrderStatus: LastOrderStatus | null;
  lastVisitDate: string | null;
  nextRevisitDueDate: string | null;
  doNotContact: boolean | null;
  dncVerified: boolean | null;
  dncDebug: string;
  crmUnverified: boolean;
  crmSource: string | null;
  crmStale: boolean;
  sources: {
    match: "crm_match";
    internal: "crm" | "unavailable" | "unmatched";
  };
};

export type ProspectSearchSuccess = {
  ok: true;
  startPoint: { lat: number; lng: number };
  placesProvider: string;
  crmProvider: string;
  enrichmentProvider: string | null;
  result: VisitListResult;
  briefByAccountId: Record<string, PreVisitBriefPayload>;
  discovery: DiscoveryStats;
  enrichment: {
    enabled: boolean;
    accountsAttempted: number;
    accountsEnriched: number;
    pagesFetched: number;
    cacheHits: number;
    errors: string[];
  };
  qualifiedCount: number;
  verificationQueue: VerificationItem[];
  enrichmentByAccountId: Record<string, EnrichmentResult>;
  fieldOriginsByAccountId: Record<
    string,
    {
      googleFields: string[];
      derivedFields: string[];
      enrichedFields: string[];
      crmFields: string[];
      verifyFields: string[];
      classification: ClassificationResult;
      evidence: EvidenceRecord[];
    }
  >;
  crmByAccountId: Record<string, CrmOverlaySnapshot>;
  matchingQueue: {
    placeId: string;
    businessName: string;
    match: MatchResult;
  }[];
  visitRunId: string | null;
  crmUnavailable: boolean;
  routingProvider: string;
  routeSummary: RoutePlanSummary | null;
  routeByAccountId: Record<string, PlannedRouteStop>;
  coordsByAccountId: Record<string, { lat: number; lng: number }>;
  /** Phase 8.6 — real Routes API road geometry for the final sequence; null = schematic fallback. */
  routeGeometry: {
    encodedSegments: string[];
    provider: string;
    trafficAware: boolean;
    fetchedAt: string;
    fromCache: boolean;
  } | null;
  /** Phase 8.6 — drawn working-area constraint outcome (null when no area drawn). */
  workingAreaApplied: { points: number; excludedOutsideArea: number } | null;
  llm: {
    provider: string;
    enabled: boolean;
    briefsAttempted: number;
    briefsSynthesized: number;
    briefsFallback: number;
  };
};

export type ProspectSearchFailure = {
  ok: false;
  error: string;
};

const defaultCredentials = (): AccountCredentialSignals => ({
  hasPhysicianOrNp: false,
  hasRn: false,
  hasNd: false,
  hasImg: false,
  hasAllied: false,
  physicianOrNpOnSiteForPrp: false,
  rnHasPhysicianDirective: false,
});

function threadSignalFromPlace(place: RawPlace): boolean | null {
  const hay = `${place.businessName} ${place.discoverySignals.join(" ")}`.toLowerCase();
  if (/pdo|thread lift|threadlifting|silhouette lift/.test(hay)) return true;
  return null;
}

function asClinical(status: CrmInternalAccount | null): CrmAccountStatus | null {
  return status as CrmAccountStatus | null;
}

export async function runProspectSearch(
  input: ProspectSearchInput,
): Promise<ProspectSearchSuccess | ProspectSearchFailure> {
  const places = getPlacesProvider();
  const crm = getCrmProvider();
  const routing = getRoutingProvider();
  const routingCfg = getRoutingConfig();
  const enrichCfg = getEnrichmentConfig();
  const enrichmentProvider = enrichCfg.enabled ? getEnrichmentProvider() : null;
  const crmUnavailable = crm.isUnavailable();
  const crmStale =
    "isStale" in crm && typeof (crm as { isStale?: () => boolean }).isStale === "function"
      ? Boolean((crm as { isStale: () => boolean }).isStale())
      : false;
  const geocodedAt = new Date();

  let startPoint;
  let startGeocodeProvider: string = places.name;
  if (
    input.startCoords &&
    Number.isFinite(input.startCoords.lat) &&
    Number.isFinite(input.startCoords.lng)
  ) {
    // Client-selected start (Places selection, dropped pin, or geolocation) —
    // exact coordinates are retained; no server geocoding round-trip.
    startPoint = { lat: input.startCoords.lat, lng: input.startCoords.lng };
    startGeocodeProvider = input.startPlaceId ? "client_google_place" : "client_selection";
  } else {
    try {
      startPoint = await places.geocode(input.startQuery, input.provinceCode);
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : `Geocoding failed for "${input.startQuery}". Check Places provider credentials.`,
      };
    }
  }

  if (!startPoint) {
    return {
      ok: false,
      error: `Could not geocode starting point "${input.startQuery}" for ${input.provinceCode}. With mock provider try M5V 2T6 (ON), T2P 1J9 (AB), or V6B 1A1 (BC).`,
    };
  }

  const maxSearches = Number(process.env.GOOGLE_PLACES_MAX_SEARCHES_PER_RUN ?? 24);
  const fetchDetails = (process.env.GOOGLE_PLACES_FETCH_DETAILS ?? "true").toLowerCase() !== "false";

  let discoveryResult;
  try {
    discoveryResult = await discoverPlaces(places, {
      origin: startPoint,
      provinceCode: input.provinceCode,
      maxRadiusKm: input.maxRadiusKm,
      discoveryTargetHint: input.dailyVisitTarget,
      maxSearchesPerRun: maxSearches,
      fetchDetails: places.name === "google" ? fetchDetails : false,
      earlyStopOnCandidateVolume: true,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Places discovery failed",
    };
  }

  const { candidates: discovered, stats: discovery } = discoveryResult;

  if (discovery.errors.length && discovered.length === 0) {
    return {
      ok: false,
      error: `Places provider error: ${discovery.errors[0]}`,
    };
  }

  const enrichmentByAccountId: Record<string, EnrichmentResult> = {};
  const enrichmentErrors: string[] = [];
  let accountsAttempted = 0;
  let accountsEnriched = 0;
  let pagesFetched = 0;
  let cacheHits = 0;
  const requestBudget = { value: enrichCfg.maxRequests };

  const inTaxonomyDiscovered = discovered.filter((d) => d.classification.inTaxonomy);

  if (enrichmentProvider && enrichCfg.enabled) {
    for (const { place } of inTaxonomyDiscovered) {
      if (accountsAttempted >= enrichCfg.maxAccounts) break;
      if (requestBudget.value <= 0) break;

      accountsAttempted += 1;
      const website =
        place.website ??
        (places.name === "mock" ? mockWebsiteForPlace(place.placeId) : null);

      try {
        const placesEvidence: EvidenceRecord[] = [];
        if (website) {
          placesEvidence.push({
            fieldPath: "website",
            value: website,
            sourceType: place.provider === "google" ? "places" : "mock",
            sourceUrl: place.googleMapsUrl,
            sourceTitle: null,
            snippet: website,
            retrievedAt: place.fetchedAt,
            confidence: "high",
            verificationState: "VERIFIED_SOURCE",
          });
        }

        const enriched = await enrichmentProvider.enrich(
          {
            accountId: place.placeId,
            businessName: place.businessName,
            website,
            placesEvidence,
          },
          {
            maxPagesPerAccount: enrichCfg.maxPagesPerAccount,
            maxRequestsRemaining: requestBudget,
            timeoutMs: enrichCfg.timeoutMs,
            maxBytes: enrichCfg.maxBytes,
            cacheTtlSeconds: enrichCfg.cacheTtlSeconds,
            forceRefresh: enrichCfg.forceRefresh,
          },
        );
        enrichmentByAccountId[place.placeId] = enriched;
        pagesFetched += enriched.pagesFetched;
        cacheHits += enriched.cacheHits;
        enrichmentErrors.push(...enriched.errors);
        if (!enriched.skipped) accountsEnriched += 1;
      } catch (e) {
        enrichmentErrors.push(
          `${place.businessName}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  const crmAccounts = (crmUnavailable ? [] : await crm.listAccounts()).filter(
    (a) => !a.provinceCode || a.provinceCode === input.provinceCode,
  );
  const mappings = await loadPersistedMappings();
  const asOf = process.env.CRM_AS_OF_DATE ?? MOCK_CRM_AS_OF;

  const crmRevisits = crmUnavailable
    ? []
    : await crm.getRevisitsDue(asOf, input.provinceCode);
  const crmVisited = crmUnavailable
    ? []
    : await crm.getAlreadyVisitedNotDue(asOf, input.provinceCode);

  const crmRevisitKeys = crmRevisits.flatMap((a) =>
    [a.placeId, a.businessName].filter(Boolean) as string[],
  );
  const crmAlreadyVisitedKeys = crmVisited.flatMap((a) =>
    [a.placeId, a.businessName].filter(Boolean) as string[],
  );

  const candidates: ProspectCandidate[] = [];
  const fieldOriginsByAccountId: ProspectSearchSuccess["fieldOriginsByAccountId"] = {};
  const crmByAccountId: Record<string, CrmOverlaySnapshot> = {};
  const matchingQueue: ProspectSearchSuccess["matchingQueue"] = [];
  const verificationQueue: VerificationItem[] = [];
  const openingHoursByAccountId: Record<string, unknown | null | undefined> = {};
  const coordsByAccountId: Record<string, { lat: number; lng: number }> = {};

  const workingArea =
    input.workingArea && input.workingArea.length >= 3 ? input.workingArea : null;
  let excludedOutsideArea = 0;

  for (const { place, classification } of discovered) {
    if (!classification.inTaxonomy) continue;
    if (
      workingArea &&
      !pointInWorkingArea({ lat: place.latitude, lng: place.longitude }, workingArea)
    ) {
      excludedOutsideArea += 1;
      continue;
    }

    const match = matchPublicToCrm(
      {
        placeId: place.placeId,
        businessName: place.businessName,
        streetAddress: place.streetAddress,
        postalCode: place.postalCode,
        phone: place.mainPhone,
        website: place.website,
      },
      crmAccounts,
      mappings,
      undefined,
      crmUnavailable,
    );

    const applied = shouldAutoApplyMatch(match) ? match.crmAccount : null;
    const dnc = evaluateDnc(match, applied);
    const clinical = asClinical(applied);

    if (
      match.state === "POSSIBLE" ||
      match.state === "CONFLICT" ||
      match.state === "MANUAL_VERIFY"
    ) {
      matchingQueue.push({
        placeId: place.placeId,
        businessName: place.businessName,
        match,
      });
    }

    const enriched = enrichmentByAccountId[place.placeId] ?? null;
    const signals = signalsFromEnrichment(enriched);

    const credentials = mergeCredentials(
      applied?.credentials ?? defaultCredentials(),
      signals.credentials,
    );

    const formerMeso = applied?.formerMesoesteticCustomer ?? false;
    const lastOrderStatus = applied
      ? deriveLastOrderStatus(applied.lastOrderDate, new Date(asOf))
      : null;

    candidates.push({
      id: place.placeId,
      businessName: place.businessName,
      parentGroupName: null,
      organizationTypeLabel:
        classification.organizationTypeLabel ?? ORGANIZATION_TYPE_LABELS.INDEPENDENT,
      segmentNumber: classification.segmentNumber,
      categoryNumber: classification.categoryNumber,
      categoryLabel: classification.categoryLabel,
      streetAddress: place.streetAddress,
      city: place.city,
      provinceCode: place.provinceCode,
      postalCode: place.postalCode,
      latitude: place.latitude,
      longitude: place.longitude,
      googleMapsUrl: place.googleMapsUrl,
      placeId: place.placeId,
      dataCompleteness: "needs_verification",
      qualificationInput: {
        credentials,
        advertisesThreadLifting:
          signals.advertisesThreadLifting ??
          clinical?.advertisesThreadLifting ??
          threadSignalFromPlace(place),
        pricePositioning: clinical?.pricePositioning ?? "unknown",
        formerMesoesteticCustomer: formerMeso,
        doNotContact: dnc.excluded,
        hasAcademyAccount: applied?.hasAcademyAccount ?? null,
        aptosPathway: applied?.aptosPathway ?? "NONE",
        aptosCertificationLevel: applied?.aptosCertificationLevel ?? null,
        injectablesOffered: preferEnriched(
          signals.injectablesOffered,
          clinical?.injectablesOffered ?? UNKNOWN_VERIFY,
        ),
        threadsOffered: preferEnriched(
          signals.threadsOffered,
          clinical?.threadsOffered ?? UNKNOWN_VERIFY,
        ),
        skincareLines: preferEnriched(
          signals.skincareLines,
          clinical?.skincareLines ?? UNKNOWN_VERIFY,
        ),
      },
    });
    openingHoursByAccountId[place.placeId] = place.openingHoursJson;
    coordsByAccountId[place.placeId] = { lat: place.latitude, lng: place.longitude };

    const crmFields: string[] = [];
    if (applied) {
      crmFields.push(`crmExternalId=${applied.crmExternalId}`);
      crmFields.push(`match=${match.state}/${match.method}@${match.confidence.toFixed(2)}`);
      crmFields.push(`DNC=${applied.doNotContact}`);
      crmFields.push(`academy=${applied.hasAcademyAccount}`);
      crmFields.push(`cert=${applied.aptosCertificationLevel ?? "none"}`);
      crmFields.push(`formerMeso=${applied.formerMesoesteticCustomer}`);
      crmFields.push(`lastOrder=${applied.lastOrderDate ?? "never"} (${lastOrderStatus})`);
      crmFields.push(`lastVisit=${applied.lastVisitDate ?? "none"}`);
      crmFields.push(`revisitDue=${applied.nextRevisitDueDate ?? "none"}`);
    } else {
      crmFields.push(`match=${match.state}: ${match.reason}`);
      if (dnc.crmUnverified) crmFields.push("internal status NOT VERIFIED");
    }

    crmByAccountId[place.placeId] = {
      match,
      applied: applied != null,
      crmExternalId: applied?.crmExternalId ?? null,
      internalStatus: applied?.internalStatus ?? null,
      hasAcademyAccount: applied?.hasAcademyAccount ?? null,
      aptosCertificationLevel: applied?.aptosCertificationLevel ?? null,
      aptosPathway: applied?.aptosPathway ?? null,
      formerMesoesteticCustomer: applied ? applied.formerMesoesteticCustomer : null,
      lastOrderDate: applied?.lastOrderDate ?? null,
      lastOrderStatus,
      lastVisitDate: applied?.lastVisitDate ?? null,
      nextRevisitDueDate: applied?.nextRevisitDueDate ?? null,
      doNotContact: applied ? applied.doNotContact : null,
      dncVerified: applied ? applied.dncVerified : null,
      dncDebug: dnc.debug,
      crmUnverified: dnc.crmUnverified,
      crmSource: crm.name,
      crmStale,
      sources: {
        match: "crm_match",
        internal: crmUnavailable ? "unavailable" : applied ? "crm" : "unmatched",
      },
    };

    if (enriched) {
      verificationQueue.push(...enriched.verificationItems);
    }

    const enrichedFields = enriched
      ? enriched.resolved
          .filter((r) => r.verificationState === "VERIFIED_SOURCE" || r.verificationState === "DERIVED")
          .map((r) => `${r.fieldPath}=${r.value}`)
      : [];

    const origins = buildFieldOrigins(place, classification);
    if (classification.needsVerification) {
      verificationQueue.push({
        accountId: place.placeId,
        accountName: place.businessName,
        fieldPath: "taxonomy",
        value: classification.categoryLabel,
        reason: "Ambiguous taxonomy classification",
        sourceType: "aggregation",
        sourceUrl: place.website,
        status: "AMBIGUOUS",
        snippet: classification.evidenceNotes.join("; "),
      });
    }

    fieldOriginsByAccountId[place.placeId] = {
      ...origins,
      enrichedFields,
      crmFields,
      evidence: enriched?.evidence ?? [],
    };
  }

  let result = buildDailyVisitList(
    {
      provinceCode: input.provinceCode,
      startPoint,
      dailyVisitTarget: input.dailyVisitTarget,
      maxRadiusKm: input.maxRadiusKm,
      minFitScore: input.minFitScore,
      alreadyVisitedNames: parseAccountNameList(input.alreadyVisitedRaw),
      revisitNames: parseAccountNameList(input.revisitsDueRaw),
      crmRevisitKeys,
      crmAlreadyVisitedKeys,
    },
    candidates,
  );

  const routePlan = await planVisitRoute({
    startPoint,
    qualifiedPool: result.qualifiedPool,
    coordsByAccountId,
    openingHoursByAccountId,
    dailyVisitTarget: input.dailyVisitTarget,
    maxRadiusKm: input.maxRadiusKm,
    maxDriveMinutes: input.maxDriveMinutes ?? null,
    dayStartClock: input.dayStartClock,
    dayEndClock: input.dayEndClock,
    routing,
    config: routingCfg,
  });

  const routeByAccountId: Record<string, PlannedRouteStop> = {};
  for (const s of routePlan.stops) routeByAccountId[s.accountId] = s;

  // Phase 8.6 — real road geometry for the final ordered sequence.
  // Presentation only; failure degrades to the honest schematic fallback.
  let routeGeometry: ProspectSearchSuccess["routeGeometry"] = null;
  if (routePlan.stops.length > 0 && typeof routing.computeRouteGeometry === "function") {
    const orderedPoints = [
      startPoint,
      ...routePlan.stops
        .map((s) => coordsByAccountId[s.accountId])
        .filter((c): c is { lat: number; lng: number } => c != null),
    ];
    if (orderedPoints.length >= 2) {
      try {
        const geo = await routing.computeRouteGeometry(orderedPoints, {
          maxApiCalls: routingCfg.maxApiCalls,
          trafficAware: routingCfg.trafficMode !== "traffic_unaware",
          timeoutMs: routingCfg.timeoutMs,
        });
        if (geo) {
          routeGeometry = {
            encodedSegments: geo.encodedSegments,
            provider: geo.provider,
            trafficAware: geo.trafficAware,
            fetchedAt: geo.fetchedAt,
            fromCache: geo.fromCache,
          };
        }
      } catch {
        routeGeometry = null;
      }
    }
  }

  result = {
    ...result,
    entries: routePlan.stops,
    presentationEntries: routePlan.presentationStops,
    radiusExhausted:
      routePlan.summary.radiusExhausted || routePlan.summary.scheduleCapacityExhausted,
    excludedDebug: [
      ...result.excludedDebug,
      ...routePlan.summary.excludedForRouting.map(
        (e) => `${e.businessName}: routing — ${e.reason}`,
      ),
      ...routePlan.summary.warnings.map((w) => `routing warning: ${w}`),
    ],
  };

  const visitDate = new Date();
  const briefByAccountId: Record<string, PreVisitBriefPayload> = {};
  const llm = getLlmProvider();
  const llmCfg = getLlmConfig();
  let briefsAttempted = 0;
  let briefsSynthesized = 0;
  let briefsFallback = 0;

  for (const entry of result.entries) {
    const overlay = crmByAccountId[entry.accountId];
    const appliedId = overlay?.crmExternalId;
    const status = appliedId
      ? (crmAccounts.find((a) => a.crmExternalId === appliedId) ?? null)
      : null;
    const clinical = asClinical(status);
    const enriched = enrichmentByAccountId[entry.accountId];
    const signals = signalsFromEnrichment(enriched ?? null);

    const practitionersSummary =
      signals.practitionersSummary ||
      clinical?.practitioners.map((p) => `${p.credentials} (${p.role})`).join("; ") ||
      UNKNOWN_VERIFY;

    const skincare = preferEnriched(
      signals.skincareLines,
      clinical?.skincareLines ?? UNKNOWN_VERIFY,
    );
    const services = preferEnriched(
      signals.serviceMenuSummary,
      clinical?.serviceMenuSummary ?? UNKNOWN_VERIFY,
    );

    const formerMeso = status?.formerMesoesteticCustomer ?? false;
    const visitType = entry.isRevisit ? "re-visit" : "first visit";
    const lastVisitNotes = entry.isRevisit
      ? status?.visitNotes ?? "Re-visit due (CRM/paste)"
      : null;

    const template = generatePreVisitBrief({
      ctx: {
        accountId: entry.accountId,
        accountName: entry.businessName,
        segmentNumber: entry.segmentNumber,
        categoryLabel: entry.categoryLabel,
        organizationTypeLabel: entry.organizationTypeLabel,
        provinceCode: entry.provinceCode,
        leadProduct: entry.leadProduct,
        openingAngle: entry.openingAngle,
        formerMesoesteticCustomer: formerMeso,
        aptosProductAllowed: !entry.qualification.scopeBlockedProducts.includes("APTOS"),
        serviceMenuSummary: services,
        skincareLines: skincare,
        practitionersSummary,
        pricePositioning: clinical?.pricePositioning ?? "unknown",
        googleReviewCount: null,
        thinPublicData: !enriched || enriched.skipped || enriched.facts.people.length === 0,
        enrichedNamedPractitioner: signals.practitionersSummary,
        enrichedServices: services !== UNKNOWN_VERIFY ? services : null,
        enrichedSkincare: skincare !== UNKNOWN_VERIFY ? skincare : null,
        enrichedThreads: signals.threadsOffered,
        enrichedPrp: enriched?.facts.prpOffered ?? null,
        mesoesteticOnWebsite: signals.mesoesteticMentioned,
      },
      visitDate,
      visitType,
      lastVisitNotes,
    });

    let brief = template;

    if (llmCfg.enabledForBriefs && llm.isEnabled() && briefsAttempted < llmCfg.maxAccountsPerRun) {
      briefsAttempted += 1;
      const season = seasonFromDate(visitDate);
      const province = CANADIAN_PROVINCES.find((p) => p.code === entry.provinceCode);
      const evidence: EvidenceSnippet[] = (enriched?.evidence ?? []).map((e) => ({
        fieldPath: e.fieldPath,
        value: String(e.value),
        sourceType: e.sourceType,
        sourceUrl: e.sourceUrl,
        snippet: e.snippet,
        verificationState: e.verificationState,
      }));

      const synthCtx: SynthesisContext = {
        locked: {
          accountId: entry.accountId,
          accountName: entry.businessName,
          placeId: entry.accountId,
          segmentNumber: entry.segmentNumber,
          categoryNumber: entry.categoryNumber,
          categoryLabel: entry.categoryLabel,
          organizationTypeLabel: entry.organizationTypeLabel,
          provinceCode: entry.provinceCode,
          fitScore: entry.fitScore,
          leadProduct: entry.leadProduct,
          leadProductLabel: entry.leadProductLabel,
          certificationPathwayFit: entry.certificationPathwayFit,
          openingAngle: entry.openingAngle,
          isRevisit: entry.isRevisit,
          doNotContact: false,
          formerMesoesteticCustomer: formerMeso,
          aptosProductAllowed: !entry.qualification.scopeBlockedProducts.includes("APTOS"),
          aptosCertificationLevel: overlay?.aptosCertificationLevel ?? null,
          hasAcademyAccount: overlay?.hasAcademyAccount ?? null,
          crmMatchState: overlay?.match.state ?? null,
          crmExternalId: overlay?.crmExternalId ?? null,
          lastOrderStatus: overlay?.lastOrderStatus ?? null,
          visitType,
          seasonLabel: SEASON_LABELS[season],
          seasonalPitchOrder: seasonalPitchOrder(season),
          provinceUvNote: province?.uvSeasonNote ?? "",
        },
        evidence,
        knownPublic: {
          serviceMenuSummary: services,
          skincareLines: skincare,
          practitionersSummary,
          pricePositioning: clinical?.pricePositioning ?? "unknown",
          enrichedThreads: signals.threadsOffered,
          enrichedPrp: enriched?.facts.prpOffered ?? null,
          mesoesteticOnWebsite: signals.mesoesteticMentioned ?? false,
          thinPublicData: !enriched || enriched.skipped || enriched.facts.people.length === 0,
        },
        lastVisitNotes,
        thinInputWarnings: template.thinInputWarnings,
        templateBaseline: {
          snapshotThreeLines: template.snapshotThreeLines,
          leadProductWhy: template.leadProductWhy,
          secondProductIfFirstLands: template.secondProductIfFirstLands,
          openingLines: template.openingLines,
          fiveQuestions: template.fiveQuestions,
          signalsToReadOnSite: template.signalsToReadOnSite,
          objectionsAndResponses: template.objectionsAndResponses,
          theAsk: template.theAsk,
          leaveBehind: template.leaveBehind,
          doNotSay: template.doNotSay,
        },
      };

      const synthesis = await synthesizeBriefNarrative(llm, synthCtx);
      if (synthesis.ok) {
        brief = mergeBriefWithNarrative(template, synthesis, entry.leadProductLabel);
        if (brief.llmMeta) {
          brief.llmMeta.evidenceCount = evidence.length;
        }
        briefsSynthesized += 1;
      } else {
        brief = withTemplateFallback(template, synthesis.reason, synthesis.provider);
        briefsFallback += 1;
      }
    }

    briefByAccountId[entry.accountId] = brief;
  }

  const visitRunId = await persistVisitRun({
    input: {
      ...input,
      maxDriveMinutes: input.maxDriveMinutes ?? null,
      dayStartClock: input.dayStartClock ?? null,
      dayEndClock: input.dayEndClock ?? null,
    },
    startPoint,
    startMeta: {
      inputRaw: input.startLabel ?? input.startQuery,
      geocodeProvider: startGeocodeProvider,
      geocodedAt,
    },
    entries: result.entries,
    routeStops: routePlan.stops,
    routeSummary: routePlan.summary,
    radiusExhausted: result.radiusExhausted,
    placesProvider: places.name,
    crmProvider: crm.name + (crmUnavailable ? "+unavailable" : ""),
    enrichmentProvider: enrichmentProvider?.name ?? null,
    routingProvider: routing.name,
    createdByUserId: input.actorUserId ?? null,
    repLabel: input.actorDisplayName ?? input.actorUserId ?? "rep.dev",
    crmByAccountId: Object.fromEntries(
      Object.entries(crmByAccountId).map(([k, v]) => [
        k,
        {
          crmExternalId: v.crmExternalId,
          matchState: v.match.state,
          lastOrderStatus: v.lastOrderStatus,
        },
      ]),
    ),
  });

  return {
    ok: true,
    startPoint,
    placesProvider: places.name,
    crmProvider: crm.name,
    enrichmentProvider: enrichmentProvider?.name ?? null,
    result,
    briefByAccountId,
    discovery,
    enrichment: {
      enabled: enrichCfg.enabled,
      accountsAttempted,
      accountsEnriched,
      pagesFetched,
      cacheHits,
      errors: enrichmentErrors,
    },
    qualifiedCount: result.entries.length,
    verificationQueue,
    enrichmentByAccountId,
    fieldOriginsByAccountId,
    crmByAccountId,
    matchingQueue,
    visitRunId,
    crmUnavailable,
    routingProvider: routing.name,
    routeSummary: routePlan.summary,
    routeByAccountId,
    coordsByAccountId,
    routeGeometry,
    workingAreaApplied: workingArea
      ? { points: workingArea.length, excludedOutsideArea }
      : null,
    llm: {
      provider: llm.name,
      enabled: llm.isEnabled() && llmCfg.enabledForBriefs,
      briefsAttempted,
      briefsSynthesized,
      briefsFallback,
    },
  };
}

function buildFieldOrigins(
  place: RawPlace,
  classification: ClassificationResult,
): Omit<
  ProspectSearchSuccess["fieldOriginsByAccountId"][string],
  "enrichedFields" | "crmFields" | "evidence"
> {
  const googleFields: string[] = [];
  const derivedFields = [
    `taxonomy: Segment ${classification.segmentNumber}.${classification.categoryNumber} ${classification.categoryLabel}`,
    `organizationType: ${classification.organizationTypeLabel}`,
    `classificationConfidence: ${classification.confidence}`,
  ];
  const verifyFields: string[] = [];

  const maybe = (label: string, value: unknown, fromGoogle: boolean) => {
    if (value == null || value === UNKNOWN_VERIFY || value === "") {
      verifyFields.push(label);
    } else if (fromGoogle) {
      googleFields.push(label);
    }
  };

  maybe("businessName", place.businessName, true);
  maybe("streetAddress", place.streetAddress, true);
  maybe("city", place.city, true);
  maybe("postalCode", place.postalCode, true);
  maybe("mainPhone", place.mainPhone, true);
  maybe("website", place.website, true);
  maybe("googleRating", place.googleRating, true);
  maybe("googleReviewCount", place.googleReviewCount, true);
  maybe("openingHours", place.openingHoursJson, true);
  maybe("placeId", place.placeId, true);

  if (classification.needsVerification) {
    verifyFields.push("NUVIOR taxonomy classification");
  }

  return { googleFields, derivedFields, verifyFields, classification };
}

export { CERTIFICATION_PATHWAY_LABELS };
