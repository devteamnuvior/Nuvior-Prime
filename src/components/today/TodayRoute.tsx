"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useSession } from "next-auth/react";
import { generateVisitListAction, getClinicIntelligenceAction, runClinicResearchAction, type ActionState } from "@/app/actions";
import { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import { accessibleProvinces } from "@/domain/auth/permissions";
import type { GeoPoint } from "@/domain/geo";
import { decodePolyline } from "@/domain/routing/polyline";
import { getBrowserMapsConfig, resolveExperienceMode } from "@/lib/mapsConfig";
import { pinSelection, type StartSelection } from "@/lib/placeSelection";
import { polygonAreaKm2, validateDrawnArea } from "@/domain/geo/workingArea";
import {
  OUTSIDE_TERRITORY_MESSAGE,
  drawnAreaInTerritory,
  resolvePlanningProvince,
} from "@/domain/planning/province";
import {
  effectiveDriveMinutes,
  effectiveRadiusKm,
  type AreaStrategy,
  type TravelReachMinutes,
} from "@/domain/planning/travelReach";
import {
  buildBlockedReason,
  canBuildDay,
  collapsedPlanningCopy,
  collapsedRouteCopy,
  derivePhase,
  hasStartLocation,
  materialFingerprint,
  type PlannerInputs,
} from "@/domain/planning/plannerState";
import {
  candidateDots,
  clusterCandidateDots,
  filterPoolByArea,
  opportunitySummary,
} from "@/domain/planning/opportunity";
import {
  clearPlannerSession,
  loadPlannerSession,
  savePlannerSession,
} from "@/domain/planning/sessionMemory";
import {
  EMPTY_MANUAL_PLAN,
  isManuallyAdjusted,
  moveStop,
  removeStop,
  resetManualPlan,
  toDisplayStops,
  type ManualPlanState,
} from "./manualPlan";
import { PreVisitBriefView } from "@/components/PreVisitBriefView";
import { PlanningWorkspace } from "./PlanningWorkspace";
import { Itinerary } from "./Itinerary";
import { ClinicDrawer } from "./ClinicDrawer";
import { SummaryStrip } from "./SummaryStrip";
import { Diagnostics } from "./Diagnostics";
import { MapCanvas } from "./MapCanvas";
import type { MapInteraction, MapStop } from "./mapTypes";
import { clock12 } from "@/lib/format";
import type { ProspectSearchSuccess } from "@/lib/prospecting";
import type { ClinicIntelligenceDto } from "@/domain/intelligence/clinicIntelligenceDto";
import { applyIntelligenceToBrief } from "@/domain/intelligence/applyIntelligenceToBrief";

const initial: ActionState = { status: "idle" };

const PROVINCE_CENTERS: Record<string, { lat: number; lng: number }> = {
  ON: { lat: 43.6532, lng: -79.3832 },
  QC: { lat: 45.5019, lng: -73.5674 },
  BC: { lat: 49.2827, lng: -123.1207 },
  AB: { lat: 51.0447, lng: -114.0719 },
  MB: { lat: 49.8951, lng: -97.1384 },
  SK: { lat: 52.1332, lng: -106.67 },
  NS: { lat: 44.6488, lng: -63.5752 },
  NB: { lat: 45.9636, lng: -66.6431 },
  NL: { lat: 47.5615, lng: -52.7126 },
  PE: { lat: 46.2382, lng: -63.1311 },
  YT: { lat: 60.7212, lng: -135.0568 },
  NT: { lat: 62.454, lng: -114.3718 },
  NU: { lat: 63.7467, lng: -68.517 },
};

export type ServerProviderInfo = {
  placesProvider: string;
  routingProvider: string;
};

export function TodayRoute({
  initialPlanOpen = false,
  serverProviders,
}: {
  initialPlanOpen?: boolean;
  serverProviders: ServerProviderInfo;
}) {
  const mapsCfg = getBrowserMapsConfig();
  const [state, formAction, pending] = useActionState(generateVisitListAction, initial);
  const [committed, setCommitted] = useState<ProspectSearchSuccess | null>(null);
  const [committedFingerprint, setCommittedFingerprint] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [briefId, setBriefId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [startText, setStartText] = useState("");
  const [start, setStart] = useState<StartSelection | null>(null);
  const [textCommitted, setTextCommitted] = useState(false);
  const [changingStart, setChangingStart] = useState(false);

  const [interaction, setInteraction] = useState<MapInteraction>("none");
  const [draftArea, setDraftArea] = useState<GeoPoint[]>([]);
  const [area, setArea] = useState<AreaStrategy>({ kind: "none" });
  const [areaError, setAreaError] = useState<string | null>(null);

  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("17:00");
  const [target, setTarget] = useState(20);
  const [minFit, setMinFit] = useState(3);
  const [radiusOverride, setRadiusOverride] = useState<number | null>(null);
  const [driveOverride, setDriveOverride] = useState<number | null>(null);
  const [alreadyVisited, setAlreadyVisited] = useState("none");
  const [revisitsDue, setRevisitsDue] = useState("none");

  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [manualPlan, setManualPlan] = useState<ManualPlanState>(EMPTY_MANUAL_PLAN);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [intelligenceByAccountId, setIntelligenceByAccountId] = useState<
    Record<string, ClinicIntelligenceDto>
  >({});
  const [researchingId, setResearchingId] = useState<string | null>(null);
  const sessionHydrated = useRef(false);

  const { data: session } = useSession();
  const role = session?.user?.role;
  const privileged = role === "ADMIN" || role === "MANAGER";

  const provinces = useMemo(() => {
    const all = CANADIAN_PROVINCES.map((p) => p.code);
    if (!session?.user) return CANADIAN_PROVINCES;
    const allowed = accessibleProvinces(
      {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.name,
        role: session.user.role,
        status: session.user.status,
        provinces: session.user.provinces,
        territories: session.user.territories,
      },
      all,
    );
    return CANADIAN_PROVINCES.filter((p) => allowed.includes(p.code));
  }, [session?.user]);

  const [province, setProvince] = useState<string>("ON");
  useEffect(() => {
    if (provinces.length > 0 && !provinces.some((p) => p.code === province) && !provinceError) {
      setProvince(provinces[0]!.code);
    }
  }, [provinces, province, provinceError]);

  useEffect(() => {
    if (initialPlanOpen) setSheetExpanded(true);
  }, [initialPlanOpen]);

  useEffect(() => {
    const saved = loadPlannerSession();
    if (saved) {
      setStart(saved.start);
      setStartText(saved.startText);
      setTextCommitted(saved.textCommitted);
      setArea(saved.area);
      setDayStart(saved.dayStart);
      setDayEnd(saved.dayEnd);
      setTarget(saved.target);
      setMinFit(saved.minFit);
      setRadiusOverride(saved.radiusOverride);
      setDriveOverride(saved.driveOverride);
      setAlreadyVisited(saved.alreadyVisited);
      setRevisitsDue(saved.revisitsDue);
      if (saved.province) setProvince(saved.province);
    }
    sessionHydrated.current = true;
  }, []);

  useEffect(() => {
    if (!sessionHydrated.current) return;
    savePlannerSession({
      start,
      startText,
      textCommitted,
      area,
      dayStart,
      dayEnd,
      target,
      minFit,
      radiusOverride,
      driveOverride,
      alreadyVisited,
      revisitsDue,
      province,
    });
  }, [
    start,
    startText,
    textCommitted,
    area,
    dayStart,
    dayEnd,
    target,
    minFit,
    radiusOverride,
    driveOverride,
    alreadyVisited,
    revisitsDue,
    province,
  ]);

  // Province from start — never silently switch territory.
  useEffect(() => {
    const allowed = provinces.map((p) => p.code);
    const r = resolvePlanningProvince({
      placeProvince: start?.provinceCode ?? null,
      postalCode: start?.postalCode ?? inferPostalFromLabel(start?.label ?? startText),
      coords: start ? { lat: start.lat, lng: start.lng } : null,
      allowedProvinces: allowed,
    });
    if (r.ok) {
      setProvince(r.provinceCode);
      setProvinceError(null);
    } else if (r.reason === "outside-territory") {
      setProvinceError(OUTSIDE_TERRITORY_MESSAGE);
    } else {
      setProvinceError(null);
    }
  }, [start, startText, provinces]);

  const data = committed;
  const errorMessage = state.status === "error" ? state.message : null;

  useEffect(() => {
    if (state.status !== "success") return;
    setCommitted(state.data);
    const firstRouted = Object.values(state.data.routeByAccountId).sort(
      (a, b) => a.sequence - b.sequence,
    )[0];
    setSelectedId(firstRouted?.accountId ?? null);
    setBriefId(null);
    setManualPlan(resetManualPlan());
    setEditPlanOpen(false);
    setChangingStart(false);
    setSheetExpanded(false);
  }, [state]);

  const plannerInputs: PlannerInputs = {
    start,
    startText,
    textCommitted,
    provinceCode: provinceError ? null : province,
    provinceError,
    area,
    dayStart,
    dayEnd,
    target,
    minFit,
    radiusOverride,
    driveOverride,
    alreadyVisited,
    revisitsDue,
    allowedProvinces: provinces.map((p) => p.code),
  };

  useEffect(() => {
    if (state.status === "success") {
      setCommittedFingerprint(materialFingerprint(plannerInputs));
    }
    // Capture at success only — plannerInputs identity is current, which is correct
    // if the user didn't edit mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const planAdjusted = isManuallyAdjusted(
    manualPlan,
    data
      ? Object.values(data.routeByAccountId)
          .sort((a, b) => a.sequence - b.sequence)
          .map((s) => s.accountId)
      : [],
  );

  const phase = derivePhase(plannerInputs, {
    pending,
    hasCommittedRoute: data != null,
    editPlanOpen,
    manuallyAdjusted: planAdjusted,
    committedFingerprint,
  });

  const buildEnabled = canBuildDay(plannerInputs);
  const blockedReason = buildBlockedReason(plannerInputs);
  const started = hasStartLocation(plannerInputs);

  const routeStops = useMemo(
    () =>
      data
        ? Object.values(data.routeByAccountId).sort((a, b) => a.sequence - b.sequence)
        : [],
    [data],
  );
  const optimizedIds = useMemo(() => routeStops.map((s) => s.accountId), [routeStops]);
  const displayStops = useMemo(
    () => (data ? toDisplayStops(manualPlan, routeStops) : []),
    [data, manualPlan, routeStops],
  );

  const mapStops: MapStop[] = displayStops
    .map((s) => {
      const c = data?.coordsByAccountId[s.accountId];
      if (!c) return null;
      return {
        id: s.accountId,
        seq: s.displaySeq,
        lat: c.lat,
        lng: c.lng,
        name: s.businessName,
        revisit: s.isRevisit,
        warn: s.openingHoursState !== "open" && s.openingHoursState !== "unknown",
      };
    })
    .filter((s): s is MapStop => s !== null);

  const visiblePool = useMemo(() => {
    if (!data) return [];
    return filterPoolByArea(data.result.qualifiedPool, data.coordsByAccountId, area);
  }, [data, area]);

  const candidates = useMemo(() => {
    if (!data) return [];
    const dots = candidateDots(
      visiblePool,
      data.coordsByAccountId,
      new Set(displayStops.map((s) => s.accountId)),
      { crmApplied: data.crmByAccountId },
    );
    return clusterCandidateDots(dots).map((m) =>
      m.type === "cluster"
        ? {
            id: m.id,
            lat: m.lat,
            lng: m.lng,
            name: `${m.count} accounts`,
            kind: "cluster" as const,
            count: m.count,
          }
        : { ...m.dot },
    );
  }, [data, displayStops, visiblePool]);

  const geometrySegments = useMemo(() => {
    if (!data?.routeGeometry || planAdjusted) return null;
    try {
      const segs = data.routeGeometry.encodedSegments.map(decodePolyline);
      return segs.every((s) => s.length >= 2) ? segs : null;
    } catch {
      return null;
    }
  }, [data?.routeGeometry, planAdjusted]);

  const selectedStop = selectedId
    ? (displayStops.find((s) => s.accountId === selectedId) ?? null)
    : null;
  const brief = briefId && data ? (data.briefByAccountId[briefId] ?? null) : null;
  const briefRoute = briefId && data ? data.routeByAccountId[briefId] : undefined;
  const briefIntelligence = briefId ? intelligenceByAccountId[briefId] : undefined;
  const displayBrief =
    brief && briefIntelligence && briefIntelligence.researchState !== "NOT_RESEARCHED"
      ? applyIntelligenceToBrief(brief, briefIntelligence, {
          businessName: brief.accountName,
          categoryLabel: brief.categoryLabel,
          segmentNumber: brief.segmentNumber,
        })
      : brief;

  async function loadIntelligence(accountId: string, forceRefresh = false) {
    if (!data) return;
    const stop = data.routeByAccountId[accountId];
    if (!stop) return;
    const enrichment = data.enrichmentByAccountId[accountId];
    const crm = data.crmByAccountId[accountId];
    const payload = {
      clinicId: accountId,
      businessName: stop.businessName,
      provinceCode: stop.provinceCode ?? province,
      segmentNumber: stop.segmentNumber,
      categoryLabel: stop.categoryLabel,
      websiteUrl: enrichment?.website ?? null,
      fitScore: stop.fitScore,
      enrichmentJson: enrichment ? JSON.stringify(enrichment) : null,
      crmJson: crm ? JSON.stringify(crm) : null,
    };
    if (forceRefresh) {
      setResearchingId(accountId);
      const result = await runClinicResearchAction({ ...payload, forceRefresh: true });
      setResearchingId(null);
      const dto = result.ok ? result.dto : result.dto;
      if (dto) {
        setIntelligenceByAccountId((prev) => ({ ...prev, [accountId]: dto }));
      }
      return;
    }
    const cached = await getClinicIntelligenceAction(payload);
    if (cached.ok) {
      setIntelligenceByAccountId((prev) => ({ ...prev, [accountId]: cached.dto }));
    }
  }

  useEffect(() => {
    if (!selectedId || !data) return;
    if (intelligenceByAccountId[selectedId]) return;
    void loadIntelligence(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, data]);

  const fallbackCenter = PROVINCE_CENTERS[province] ?? PROVINCE_CENTERS.ON!;
  const mode = resolveExperienceMode({
    placesProvider: serverProviders.placesProvider,
    routingProvider: serverProviders.routingProvider,
    mapRenderer: mapsCfg.renderer,
  });
  const driveHonest = serverProviders.routingProvider === "google";

  const showProvincePicker =
    provinces.length > 1 &&
    !provinceError &&
    (started
      ? !start?.provinceCode && !(start?.postalCode && start.postalCode.trim().length >= 1)
      : changingStart);

  const workingAreaPoints = area.kind === "drawn" ? area.points : [];
  const startGeo = start
    ? { lat: start.lat, lng: start.lng }
    : (data?.startPoint ?? null);

  const submitDrive = effectiveDriveMinutes(area, driveOverride);
  const submitRadius = effectiveRadiusKm(area, startGeo, radiusOverride);

  const opportunity = data ? opportunitySummary(visiblePool) : null;

  const showPlanning =
    !data ||
    editPlanOpen ||
    phase === "no-start" ||
    phase === "choose-area" ||
    phase === "configure" ||
    phase === "stale" ||
    phase === "edit-plan";

  const ctaLabel = data && (phase === "stale" || editPlanOpen) ? "Rebuild route" : "Build My Day";

  const onResolvedStart = (sel: StartSelection | null) => {
    if (sel) {
      setStart(sel);
      setStartText(sel.label);
      setTextCommitted(true);
      setChangingStart(false);
    } else {
      setStart(null);
    }
  };

  const handleMapClick = (p: GeoPoint) => {
    if (interaction === "set-start") {
      const sel = pinSelection(p.lat, p.lng);
      setStartText(sel.label);
      setStart(sel);
      setTextCommitted(true);
      setChangingStart(false);
      setInteraction("none");
      setSheetExpanded(true);
    } else if (interaction === "draw-area") {
      setDraftArea((prev) => [...prev, p]);
    }
  };

  const beginDropPin = () => {
    setInteraction("set-start");
    setSheetExpanded(false);
  };

  const beginDrawArea = () => {
    setDraftArea(area.kind === "drawn" ? area.points : []);
    setAreaError(null);
    setInteraction("draw-area");
    setSheetExpanded(false);
  };

  const finishDrawArea = () => {
    const v = validateDrawnArea(draftArea);
    if (!v.ok) {
      setAreaError(v.message);
      return;
    }
    const t = drawnAreaInTerritory(
      draftArea,
      provinces.map((p) => p.code),
    );
    if (!t.ok) {
      setAreaError(t.message);
      return;
    }
    setArea({ kind: "drawn", points: draftArea });
    setAreaError(null);
    setDraftArea([]);
    setInteraction("none");
    setSheetExpanded(true);
  };

  const cancelInteraction = () => {
    setDraftArea([]);
    setInteraction("none");
    setSheetExpanded(true);
  };

  useEffect(() => {
    if (interaction === "none") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelInteraction();
      if (e.key === "Enter" && interaction === "draw-area" && draftArea.length >= 3) {
        finishDrawArea();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interaction, draftArea.length]);

  const draftAreaKm2 = draftArea.length >= 3 ? polygonAreaKm2(draftArea) : 0;

  const newPlan = () => {
    if (data) {
      const ok =
        typeof window === "undefined" ||
        window.confirm("Start a new plan? Today's route will be cleared from this screen.");
      if (!ok) return;
    }
    setCommitted(null);
    setCommittedFingerprint(null);
    setStart(null);
    setStartText("");
    setTextCommitted(false);
    setArea({ kind: "none" });
    setAreaError(null);
    setEditPlanOpen(false);
    setChangingStart(false);
    setManualPlan(resetManualPlan());
    setSelectedId(null);
    setBriefId(null);
    setSheetExpanded(true);
    clearPlannerSession();
  };

  const nextStop = displayStops[0] ?? null;
  const planningSheet = collapsedPlanningCopy({
    hasStart: started,
    startLabel: start?.label ?? startText,
    area,
  });
  const routeSheet = nextStop
    ? collapsedRouteCopy({
        seq: nextStop.displaySeq,
        name: nextStop.businessName,
        arrivalClock: planAdjusted ? null : clock12(nextStop.arrivalClock),
        adjusted: planAdjusted,
      })
    : null;

  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-rule bg-paper px-4 py-2.5 md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {mode.showChips &&
            mode.chips.map((chip) => (
              <ModeChip key={chip.label} label={chip.label} tone={chip.tone} title={chip.detail} />
            ))}
          <p className="hidden truncate text-[13px] text-muted sm:block">
            {data
              ? `Today · ${displayStops.length} stop${displayStops.length === 1 ? "" : "s"}`
              : "Where do you want to work today?"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {data && !editPlanOpen && (
            <button
              type="button"
              onClick={() => {
                setEditPlanOpen(true);
                setSheetExpanded(true);
              }}
              className="flex h-9 items-center rounded-lg border border-rule bg-panel px-3.5 text-[13px] font-medium text-ink hover:bg-canvas"
            >
              Edit plan
            </button>
          )}
          {data && (phase === "stale" || editPlanOpen) && (
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={pending || !buildEnabled}
              className="flex h-9 items-center rounded-lg border border-rule bg-panel px-3.5 text-[13px] font-medium text-ink hover:bg-canvas disabled:opacity-60"
            >
              {pending ? "Rebuilding…" : "Rebuild route"}
            </button>
          )}
        </div>
      </div>

      {errorMessage && data && (
        <div className="border-b border-danger/20 bg-danger-tint px-4 py-2 text-xs text-danger md:px-6">
          Rebuild failed — today&rsquo;s route is unchanged. {errorMessage}
        </div>
      )}
      {phase === "stale" && (
        <div className="border-b border-signal/20 bg-signal-tint px-4 py-2 text-xs text-signal md:px-6">
          Start or area changed — travel times need rebuilding.
        </div>
      )}

      {data && <SummaryStrip data={data} manuallyAdjusted={planAdjusted} displayStopCount={displayStops.length} />}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative h-[46dvh] min-h-[280px] flex-[1.85] lg:h-auto">
          <MapCanvas
            start={startGeo}
            stops={mapStops}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id)}
            fallbackCenter={fallbackCenter}
            geometrySegments={geometrySegments}
            interaction={interaction}
            onMapClick={handleMapClick}
            draftArea={draftArea}
            onDraftClose={finishDrawArea}
            workingArea={workingAreaPoints}
            onWorkingAreaEdited={(pts) => {
              const v = validateDrawnArea(pts);
              if (!v.ok) {
                setAreaError(v.message);
                return;
              }
              const t = drawnAreaInTerritory(
                pts,
                provinces.map((p) => p.code),
              );
              if (!t.ok) {
                setAreaError(t.message);
                return;
              }
              setArea({ kind: "drawn", points: pts });
              setAreaError(null);
            }}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            candidates={candidates}
          />

          {interaction === "set-start" && (
            <InteractionBanner
              text="Tap the map to set your starting point"
              actions={[{ label: "Cancel", onClick: cancelInteraction }]}
            />
          )}
          {interaction === "draw-area" && (
            <InteractionBanner
              text={
                draftArea.length < 3
                  ? `Tap the map to outline today's area (${draftArea.length}/3 points minimum)`
                  : `${draftArea.length} points · ~${draftAreaKm2 >= 10 ? Math.round(draftAreaKm2) : draftAreaKm2.toFixed(1)} km² — tap the first point or Finish`
              }
              actions={[
                ...(draftArea.length > 0
                  ? [{ label: "Undo", onClick: () => setDraftArea((p) => p.slice(0, -1)) }]
                  : []),
                { label: "Cancel", onClick: cancelInteraction },
                ...(draftArea.length >= 3
                  ? [{ label: "Finish area", onClick: finishDrawArea, primary: true }]
                  : []),
              ]}
            />
          )}

          {pending && <RouteBuildingOverlay />}

          {selectedStop && data && (
            <ClinicDrawer
              stop={selectedStop}
              displaySeq={selectedStop.displaySeq}
              timesValid={!planAdjusted}
              data={data}
              intelligence={selectedId ? intelligenceByAccountId[selectedId] : null}
              isPrivileged={privileged}
              isResearching={researchingId === selectedStop.accountId}
              onResearch={() => void loadIntelligence(selectedStop.accountId, true)}
              onRefreshResearch={() => void loadIntelligence(selectedStop.accountId, true)}
              onClose={() => setSelectedId(null)}
              onViewBrief={() => setBriefId(selectedStop.accountId)}
            />
          )}
        </div>

        {/* Planner / itinerary — sheet on mobile, side panel on desktop */}
        <div className="lg:hidden flex items-center gap-2 border-t border-rule bg-panel px-3 py-2">
          <button
            type="button"
            onClick={() => setSheetExpanded((v) => !v)}
            className="min-w-0 flex-1 text-left"
          >
            {data && !editPlanOpen && routeSheet ? (
              <>
                <span className="block text-[0.66rem] font-semibold tracking-[0.16em] text-faint uppercase">
                  {routeSheet.kicker}
                </span>
                <span className="block truncate text-sm font-semibold text-ink">{routeSheet.title}</span>
                <span className="block text-xs text-muted">{routeSheet.subtitle}</span>
              </>
            ) : (
              <>
                <span className="block text-sm font-semibold text-ink">{planningSheet.title}</span>
                <span className="block text-xs text-muted">{planningSheet.subtitle}</span>
              </>
            )}
          </button>
          {(!data || editPlanOpen) && buildEnabled && (
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={pending}
              className="shrink-0 rounded-lg bg-accent px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-white uppercase disabled:opacity-60"
            >
              {pending ? "…" : ctaLabel === "Rebuild route" ? "Rebuild" : "Build My Day"}
            </button>
          )}
          <span className="shrink-0 text-xs font-semibold text-accent">{sheetExpanded ? "Close" : "Open"}</span>
        </div>

        <aside
          className={`${
            sheetExpanded ? "flex" : "hidden"
          } nv-scroll max-h-[52dvh] w-full flex-col overflow-hidden border-t border-rule bg-paper lg:flex lg:max-h-none lg:w-[34%] lg:border-t-0 lg:border-l`}
        >
          <div className={showPlanning ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
            <PlanningWorkspace
              phase={phase}
              formAction={formAction}
              pending={pending}
              error={!data ? errorMessage : null}
              formRef={formRef}
              googleEnabled={mapsCfg.enabled}
              provinces={provinces}
              province={province}
              onProvinceChange={(c) => {
                setProvince(c);
                setProvinceError(null);
              }}
              showProvincePicker={showProvincePicker}
              startText={startText}
              onStartTextChange={setStartText}
              start={start}
              onResolvedStart={onResolvedStart}
              onRequestDropPin={beginDropPin}
              onRequestDrawArea={beginDrawArea}
              onClearArea={() => {
                setArea({ kind: "none" });
                setAreaError(null);
              }}
              area={area}
              onSelectReach={(m: TravelReachMinutes) => {
                setArea({ kind: "travel-reach", minutes: m });
                setAreaError(null);
              }}
              areaError={areaError}
              driveHonest={driveHonest}
              dayStart={dayStart}
              dayEnd={dayEnd}
              onDayStart={setDayStart}
              onDayEnd={setDayEnd}
              target={target}
              onTarget={setTarget}
              minFit={minFit}
              onMinFit={setMinFit}
              radiusOverride={radiusOverride}
              onRadiusOverride={(n) => {
                setRadiusOverride(n);
                if (n != null && n > 0 && (area.kind === "none" || area.kind === "radius")) {
                  setArea({ kind: "radius", km: n });
                }
                if (n == null && area.kind === "radius") setArea({ kind: "none" });
              }}
              driveOverride={driveOverride}
              onDriveOverride={setDriveOverride}
              alreadyVisited={alreadyVisited}
              onAlreadyVisited={setAlreadyVisited}
              revisitsDue={revisitsDue}
              onRevisitsDue={setRevisitsDue}
              blockedReason={blockedReason}
              opportunity={opportunity}
              ctaLabel={ctaLabel}
              onNewPlan={newPlan}
              onChangeStart={() => setChangingStart(true)}
              changingStart={changingStart}
              buildEnabled={buildEnabled}
              submitRadiusKm={submitRadius}
              submitDriveMinutes={submitDrive}
              hasStart={started}
              onCommitTextStart={() => setTextCommitted(true)}
              provinceError={provinceError}
              canPlanSomewhereElse={privileged || provinces.length > 1}
              onPlanSomewhereElse={() => {
                setStart(null);
                setStartText("");
                setTextCommitted(false);
                setChangingStart(true);
                setProvinceError(null);
              }}
            />
          </div>
          {!showPlanning && data && data.routeSummary ? (
            <>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule-soft bg-paper px-4 py-3">
                <h2 className="text-[0.7rem] font-semibold tracking-[0.16em] text-faint uppercase">
                  Itinerary
                </h2>
                <button
                  type="button"
                  onClick={() => setEditPlanOpen(true)}
                  className="text-xs font-medium text-muted hover:text-ink"
                >
                  Edit plan
                </button>
              </div>
              <Itinerary
                stops={displayStops}
                dayStartClock={data.routeSummary.dayStartClock}
                startLabel={start?.label ?? startText}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onViewBrief={(id) => {
                  setSelectedId(id);
                  setBriefId(id);
                }}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                adjusted={planAdjusted}
                removedCount={manualPlan.removed.length}
                onMove={(id, dir) => setManualPlan((s) => moveStop(s, optimizedIds, id, dir))}
                onRemove={(id) => {
                  setManualPlan((s) => removeStop(s, optimizedIds, id));
                  if (selectedId === id) setSelectedId(null);
                }}
                onResetPlan={() => setManualPlan(resetManualPlan())}
                intelligenceByAccountId={intelligenceByAccountId}
              />
              {privileged && <Diagnostics data={data} />}
            </>
          ) : !showPlanning && pending ? (
            <ItinerarySkeleton />
          ) : null}
        </aside>
      </div>

      {displayBrief && (
        <div
          className="fixed inset-0 z-[1200] flex items-end justify-center bg-ink/40 p-0 md:items-center md:p-8"
          onClick={() => setBriefId(null)}
        >
          <div
            className="nv-scroll max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-panel shadow-float md:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <PreVisitBriefView
              brief={displayBrief}
              fitScore={briefRoute?.fitScore}
              arrivalClock={planAdjusted ? null : (briefRoute?.arrivalClock ?? null)}
              onClose={() => setBriefId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );

  return mapsCfg.enabled ? (
    <APIProvider apiKey={mapsCfg.apiKey} libraries={["places"]} region="CA" language="en">
      {content}
    </APIProvider>
  ) : (
    content
  );
}

function inferPostalFromLabel(label: string): string | null {
  const m = /\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i.exec(label);
  return m ? m[1]!.toUpperCase() : null;
}

function ModeChip({
  label,
  tone,
  title,
}: {
  label: string;
  tone: "signal" | "neutral" | "accent";
  title: string;
}) {
  const cls =
    tone === "accent"
      ? "bg-accent-tint text-accent"
      : tone === "signal"
        ? "bg-signal-tint text-signal"
        : "bg-canvas text-muted";
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold whitespace-nowrap ${cls}`}
    >
      <span className={`h-1 w-1 rounded-full ${tone === "accent" ? "bg-accent" : tone === "signal" ? "bg-signal" : "bg-faint"}`} />
      {label}
    </span>
  );
}

function InteractionBanner({
  text,
  actions,
}: {
  text: string;
  actions: { label: string; onClick: () => void; primary?: boolean }[];
}) {
  return (
    <div className="absolute top-3 left-1/2 z-[1060] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-rule bg-panel px-3.5 py-2 shadow-float">
      <span className="text-xs font-medium whitespace-nowrap text-ink">{text}</span>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className={`h-8 shrink-0 rounded-md px-3 text-xs font-semibold ${
            a.primary
              ? "bg-accent text-white hover:bg-accent-hover"
              : "border border-rule bg-paper text-ink hover:bg-canvas"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

const BUILD_STAGES = [
  "Finding clinics in this area…",
  "Evaluating accounts…",
  "Building today's best route…",
];

function RouteBuildingOverlay() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStage((s) => (s + 1) % BUILD_STAGES.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="nv-fade-in absolute inset-0 z-[1050] flex items-center justify-center bg-paper/60 backdrop-blur-[2px]">
      <div className="nv-fade-up flex w-[290px] flex-col items-center rounded-xl border border-rule bg-panel px-6 py-5 shadow-float">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-rule border-t-accent" />
        <p className="mt-3 text-[13px] font-semibold text-ink">Building your day</p>
        <p className="mt-1 h-4 text-xs text-muted" aria-live="polite">
          {BUILD_STAGES[stage]}
        </p>
      </div>
    </div>
  );
}

function ItinerarySkeleton() {
  return (
    <div className="px-4 py-4" aria-hidden>
      <div className="mb-4 h-3 w-20 animate-pulse rounded bg-rule/60" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="mb-3 flex gap-3" style={{ opacity: 1 - i * 0.15 }}>
          <div className="mt-1 h-7 w-7 shrink-0 animate-pulse rounded-full bg-rule/60" />
          <div className="min-w-0 flex-1 rounded-lg border border-rule-soft bg-panel px-3.5 py-3">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-rule/60" />
            <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-rule/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
