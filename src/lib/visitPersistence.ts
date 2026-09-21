import { prisma } from "@/lib/prisma";
import type { LeadProduct, Prisma } from "@prisma/client";
import type { VisitListEntry } from "@/domain/visitList";
import type { PlannedRouteStop, RoutePlanSummary } from "@/domain/routing/optimize";

export async function persistVisitRun(opts: {
  input: {
    provinceCode: string;
    startQuery: string;
    dailyVisitTarget: number;
    maxRadiusKm: number;
    maxDriveMinutes?: number | null;
    dayStartClock?: string | null;
    dayEndClock?: string | null;
    minFitScore: number;
    alreadyVisitedRaw: string;
    revisitsDueRaw: string;
  };
  startPoint: { lat: number; lng: number };
  startMeta?: {
    inputRaw: string;
    geocodeProvider: string;
    geocodedAt: Date;
  };
  entries: VisitListEntry[];
  routeStops?: PlannedRouteStop[];
  routeSummary?: RoutePlanSummary | null;
  radiusExhausted: boolean;
  placesProvider: string;
  crmProvider: string;
  enrichmentProvider: string | null;
  routingProvider?: string | null;
  createdByUserId?: string | null;
  repLabel?: string | null;
  crmByAccountId: Record<
    string,
    {
      crmExternalId: string | null;
      matchState: string;
      lastOrderStatus: string | null;
    }
  >;
}): Promise<string | null> {
  try {
    const calculatedAt = new Date();
    const run = await prisma.visitListRun.create({
      data: {
        provinceCode: opts.input.provinceCode,
        startQuery: opts.input.startQuery,
        startLat: opts.startPoint.lat,
        startLng: opts.startPoint.lng,
        startInputRaw: opts.startMeta?.inputRaw ?? opts.input.startQuery,
        startGeocodeProvider: opts.startMeta?.geocodeProvider ?? null,
        startGeocodedAt: opts.startMeta?.geocodedAt ?? null,
        dailyVisitTarget: opts.input.dailyVisitTarget,
        maxRadiusKm: opts.input.maxRadiusKm,
        maxDriveMinutes: opts.input.maxDriveMinutes ?? null,
        dayStartClock: opts.input.dayStartClock ?? null,
        dayEndClock: opts.input.dayEndClock ?? null,
        minFitScore: opts.input.minFitScore,
        alreadyVisitedRaw: opts.input.alreadyVisitedRaw,
        revisitsDueRaw: opts.input.revisitsDueRaw,
        radiusExhausted: opts.radiusExhausted,
        placesProvider: opts.placesProvider,
        crmProvider: opts.crmProvider,
        enrichmentProvider: opts.enrichmentProvider,
        routingProvider: opts.routingProvider ?? null,
        routeSummaryJson: (opts.routeSummary ?? undefined) as Prisma.InputJsonValue | undefined,
        providerMode: `${opts.placesProvider}+${opts.crmProvider}+${opts.routingProvider ?? "geodesic"}`,
        repIdPlaceholder: opts.repLabel ?? "rep.dev",
        createdByUserId: opts.createdByUserId ?? null,
        status: "completed",
      },
    });

    const routeById = new Map(
      (opts.routeStops ?? []).map((s) => [s.accountId, s] as const),
    );

    let rank = 0;
    for (const e of opts.entries) {
      rank += 1;
      const account = await prisma.account.findFirst({
        where: { placeId: e.accountId },
      });
      if (!account) continue;
      const crm = opts.crmByAccountId[e.accountId];
      const route = routeById.get(e.accountId);
      await prisma.visitListItem.create({
        data: {
          runId: run.id,
          accountId: account.id,
          sortDistanceKm: e.distanceKm,
          postalCodePrefix: e.postalCodePrefix,
          isRevisit: e.isRevisit,
          fitScore: e.fitScore,
          leadProduct: e.leadProduct as LeadProduct,
          openingAngle: e.openingAngle,
          needsManualVerification: e.needsManualVerification,
          rank,
          crmExternalId: crm?.crmExternalId ?? null,
          crmMatchState: crm?.matchState ?? null,
          lastOrderStatusSnapshot: crm?.lastOrderStatus ?? null,
          plannedSequence: route?.sequence ?? rank,
          arrivalEstimate: route?.arrivalClock ?? null,
          departureEstimate: route?.departureClock ?? null,
          travelMinutesFromPrev: route?.travelMinutesFromPrevious ?? null,
          travelDistanceKmFromPrev: route?.travelDistanceKmFromPrevious ?? null,
          cumulativeDriveMinutes: route?.cumulativeDriveMinutes ?? null,
          plannedVisitMinutes: route?.plannedVisitMinutes ?? null,
          openingHoursFeasibility: route?.openingHoursState ?? null,
          routeProvider: opts.routingProvider ?? null,
          routeCalculatedAt: calculatedAt,
          routeReasons: route?.routeReasons ?? [],
          durationIsGeodesicEstimate: route?.durationIsGeodesicEstimate ?? null,
        },
      });
    }

    return run.id;
  } catch (e) {
    console.warn(
      "[visitPersistence] Could not persist visit run:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export async function createVisitRecord(input: {
  placeId?: string | null;
  crmExternalId?: string | null;
  visitDate: string;
  visitType: string;
  outcome?: string | null;
  peopleMet?: string | null;
  productsDiscussed?: string | null;
  nextAction?: string | null;
  followUpDate?: string | null;
  notes?: string | null;
  repIdPlaceholder?: string | null;
  createdByUserId?: string | null;
}): Promise<{ id: string } | { error: string }> {
  try {
    let accountId: string | null = null;
    if (input.placeId) {
      const account = await prisma.account.findFirst({
        where: { placeId: input.placeId },
      });
      accountId = account?.id ?? null;
    }

    const row = await prisma.visitRecord.create({
      data: {
        accountId,
        placeId: input.placeId ?? null,
        crmExternalId: input.crmExternalId ?? null,
        repIdPlaceholder: input.repIdPlaceholder ?? "rep.dev",
        createdByUserId: input.createdByUserId ?? null,
        visitDate: new Date(input.visitDate),
        visitType: input.visitType,
        outcome: input.outcome ?? null,
        peopleMet: input.peopleMet ?? null,
        productsDiscussed: input.productsDiscussed ?? null,
        nextAction: input.nextAction ?? null,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
        notes: input.notes ?? null,
      },
    });
    return { id: row.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save visit" };
  }
}
