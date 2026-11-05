"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { useSession } from "next-auth/react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { StatusChip } from "@/components/feedback/StatusChip";
import { LAYOUT } from "@/theme/tokens";
import {
  generateVisitListAction,
  getClinicIntelligenceAction,
  getClinicWebProfileAction,
  runClinicResearchAction,
  runClinicWebProfileAction,
  type ActionState,
} from "@/app/actions";
import type { ClinicWebProfileDto } from "@/domain/clinicProfile/runClinicProfile";
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
  defaultArea,
  effectiveRadiusKm,
  type AreaStrategy,
} from "@/domain/planning/area";
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
import { MyDayPanel } from "./MyDayPanel";
import { MonthStrip } from "./MonthStrip";
import type { RepDashboardDto } from "@/lib/repDashboard";
import { Itinerary } from "./Itinerary";
import { ClinicDrawer } from "./ClinicDrawer";
import { SummaryStrip } from "./SummaryStrip";
import { Diagnostics } from "./Diagnostics";
import { MapCanvas } from "./MapCanvas";
import { MAP_Z } from "./mapChrome";
import type { MapInteraction, MapStop, MapVisited } from "./mapTypes";
import { clock12 } from "@/lib/format";
import type { ProspectSearchSuccess } from "@/lib/prospecting";
import type { ClinicIntelligenceDto } from "@/domain/intelligence/clinicIntelligenceDto";
import { applyIntelligenceToBrief } from "@/domain/intelligence/applyIntelligenceToBrief";
import { SHOW_CLINIC_INTELLIGENCE } from "@/lib/featureFlags";

const initial: ActionState = { status: "idle" };

/** The rep only shares a location; the day is the nearest clinics within this radius unless they draw an area or change it under Edit plan. */
const DEFAULT_AREA: AreaStrategy = defaultArea();

/** Pre-visit brief is hidden for now — the brief is still generated; flip to true to show the buttons again. */
const SHOW_PRE_VISIT_BRIEF = false;

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
  dashboard = null,
}: {
  initialPlanOpen?: boolean;
  serverProviders: ServerProviderInfo;
  /** Performance phase 3 — the signed-in rep's own day; null hides the panel. */
  dashboard?: RepDashboardDto | null;
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
  const [area, setArea] = useState<AreaStrategy>(DEFAULT_AREA);


  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [newPlanConfirmOpen, setNewPlanConfirmOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [manualPlan, setManualPlan] = useState<ManualPlanState>(EMPTY_MANUAL_PLAN);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [intelligenceByAccountId, setIntelligenceByAccountId] = useState<
    Record<string, ClinicIntelligenceDto>
  >({});
  const [researchingId, setResearchingId] = useState<string | null>(null);
  const [webProfileByAccountId, setWebProfileByAccountId] = useState<
    Record<string, ClinicWebProfileDto>
  >({});
  const [profilingId, setProfilingId] = useState<string | null>(null);
  const sessionHydrated = useRef(false);

  const { data: session } = useSession();
  const role = session?.user?.role;
  const privileged = role === "ADMIN";

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
      setArea(saved.area.kind === "none" ? DEFAULT_AREA : saved.area);
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
      province,
    });
  }, [
    start,
    startText,
    textCommitted,
    area,
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

  // Location-first: once the rep has a start and nothing is built yet, build the day
  // without a second tap. One attempt per set of inputs, so an error does not loop.
  const autoBuiltFor = useRef<string | null>(null);
  useEffect(() => {
    if (data || pending || editPlanOpen || !buildEnabled || !start) return;
    const key = materialFingerprint(plannerInputs);
    if (autoBuiltFor.current === key) return;
    autoBuiltFor.current = key;
    formRef.current?.requestSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pending, editPlanOpen, buildEnabled, start, province]);

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

  const visitedMarks: MapVisited[] = useMemo(
    () =>
      (data?.result.visitedNearby ?? []).map((v) => ({
        id: v.accountId,
        lat: v.latitude,
        lng: v.longitude,
        name: v.businessName,
        by: v.visitedBy,
        on: v.visitedOn,
        mine: v.mine,
      })),
    [data],
  );

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
    // Clinic intelligence is hidden for now: nothing is loaded, so nothing can show.
    if (!SHOW_CLINIC_INTELLIGENCE) return;
    if (!selectedId || !data) return;
    if (intelligenceByAccountId[selectedId]) return;
    void loadIntelligence(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, data]);

  // Claude web research: public contact/identity facts. Cached read on select;
  // the provider only runs when the rep asks for it (it costs an API call).
  async function loadWebProfile(accountId: string, run = false) {
    if (!data) return;
    const stop = data.routeByAccountId[accountId];
    if (!stop) return;
    const provinceCode = stop.provinceCode ?? province;
    if (!run) {
      const cached = await getClinicWebProfileAction({ clinicId: accountId, provinceCode });
      if (cached.ok) {
        setWebProfileByAccountId((prev) => ({ ...prev, [accountId]: cached.dto }));
      }
      return;
    }
    const enrichment = data.enrichmentByAccountId[accountId];
    setProfilingId(accountId);
    try {
      const result = await runClinicWebProfileAction({
        clinicId: accountId,
        businessName: stop.businessName,
        provinceCode,
        streetAddress: stop.streetAddress,
        city: stop.city,
        postalCode: stop.postalCode,
        categoryLabel: stop.categoryLabel,
        knownWebsite: enrichment?.website ?? null,
        knownPhone: null,
      });
      const dto = result.ok ? result.dto : result.dto;
      if (dto) {
        setWebProfileByAccountId((prev) => ({ ...prev, [accountId]: dto }));
      } else if (!result.ok) {
        setWebProfileByAccountId((prev) => ({
          ...prev,
          [accountId]: {
            clinicId: accountId,
            state: "FAILED",
            profile: prev[accountId]?.profile ?? null,
            provider: null,
            model: null,
            researchedAt: null,
            failureMessage: result.error,
            searchesUsed: null,
          },
        }));
      }
    } finally {
      setProfilingId(null);
    }
  }

  useEffect(() => {
    if (!selectedId || !data) return;
    if (webProfileByAccountId[selectedId]) return;
    void loadWebProfile(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, data]);

  const fallbackCenter = PROVINCE_CENTERS[province] ?? PROVINCE_CENTERS.ON!;
  const mode = resolveExperienceMode({
    placesProvider: serverProviders.placesProvider,
    routingProvider: serverProviders.routingProvider,
    mapRenderer: mapsCfg.renderer,
  });

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

  const submitRadius = effectiveRadiusKm(area, startGeo);

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

  const finishDrawArea = () => {
    const v = validateDrawnArea(draftArea);
    if (!v.ok) {
      return;
    }
    const t = drawnAreaInTerritory(
      draftArea,
      provinces.map((p) => p.code),
    );
    if (!t.ok) {
      return;
    }
    setArea({ kind: "drawn", points: draftArea });
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
      setNewPlanConfirmOpen(true);
      return;
    }
    resetPlan();
  };

  const resetPlan = () => {
    setNewPlanConfirmOpen(false);
    setCommitted(null);
    setCommittedFingerprint(null);
    setStart(null);
    setStartText("");
    setTextCommitted(false);
    setArea(DEFAULT_AREA);
    setEditPlanOpen(false);
    autoBuiltFor.current = null;
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
    // Desktop: the workspace fills the viewport below the header so the planner / itinerary panel
    // scrolls on its own; phones scroll the page (map on top, sheet below).
    <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", maxHeight: { md: `calc(100dvh - ${LAYOUT.headerHeight}px)` } }}>
      {/* Provider chips — only when a provider is not live (dev / mock). Edit plan and Rebuild live in the side panel. */}
      {mode.showChips && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2.5,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.default",
            px: { xs: 4, md: 6 },
            py: 2.5,
          }}
        >
          {mode.chips.map((chip) => (
            <ModeChip key={chip.label} label={chip.label} tone={chip.tone} title={chip.detail} />
          ))}
        </Box>
      )}

      {errorMessage && data && (
        <Alert severity="error" icon={false} sx={{ borderRadius: 0, borderBottom: 1, borderColor: "divider", px: { xs: 4, md: 6 }, py: 0.5 }}>
          Rebuild failed — today&rsquo;s route is unchanged. {errorMessage}
        </Alert>
      )}
      {phase === "stale" && (
        <Alert severity="warning" icon={false} sx={{ borderRadius: 0, borderBottom: 1, borderColor: "divider", px: { xs: 4, md: 6 }, py: 0.5 }}>
          Start or area changed — travel times need rebuilding.
        </Alert>
      )}

      {dashboard && <MonthStrip dashboard={dashboard} />}

      {data && <SummaryStrip data={data} manuallyAdjusted={planAdjusted} displayStopCount={displayStops.length} />}

      <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: { xs: "column", md: "row" } }}>
        {/* Map — the canvas; everything else floats over it */}
        <Box sx={{ position: "relative", minHeight: 280, height: { xs: "46dvh", md: "auto" }, flex: { xs: "1 1 0%", md: "1 1 0%" } }}>
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
                return;
              }
              const t = drawnAreaInTerritory(
                pts,
                provinces.map((p) => p.code),
              );
              if (!t.ok) {
                return;
              }
              setArea({ kind: "drawn", points: pts });
            }}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            candidates={candidates}
            visited={visitedMarks}
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
              webProfile={selectedId ? webProfileByAccountId[selectedId] : null}
              isProfiling={profilingId === selectedStop.accountId}
              onProfile={() => void loadWebProfile(selectedStop.accountId, true)}
              onClose={() => setSelectedId(null)}
              onViewBrief={SHOW_PRE_VISIT_BRIEF ? () => setBriefId(selectedStop.accountId) : undefined}
            />
          )}
        </Box>

        {/* Planner / itinerary — sheet on phones, side panel from tablet landscape up */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            gap: 2,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            px: 3,
            py: 2,
          }}
        >
          <ButtonBase
            onClick={() => setSheetExpanded((v) => !v)}
            aria-expanded={sheetExpanded}
            aria-controls="nv-planner-sheet"
            sx={{ minWidth: 0, flex: 1, display: "block", textAlign: "left", borderRadius: 1 }}
          >
            {data && !editPlanOpen && routeSheet ? (
              <>
                <Typography variant="eyebrow" sx={{ display: "block" }}>
                  {routeSheet.kicker}
                </Typography>
                <Typography variant="body1" noWrap sx={{ fontWeight: 600 }}>
                  {routeSheet.title}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  {routeSheet.subtitle}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {planningSheet.title}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  {planningSheet.subtitle}
                </Typography>
              </>
            )}
          </ButtonBase>
          {(!data || editPlanOpen) && buildEnabled && (
            <Button
              variant="contained"
              size="small"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={pending}
              sx={{ flexShrink: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.6875rem" }}
            >
              {pending ? "…" : ctaLabel === "Rebuild route" ? "Rebuild" : "Build My Day"}
            </Button>
          )}
          <Typography variant="caption" sx={{ flexShrink: 0, fontWeight: 600, color: "primary.main" }}>
            {sheetExpanded ? "Close" : "Open"}
          </Typography>
        </Box>

        <Box
          component="aside"
          id="nv-planner-sheet"
          className="nv-scroll"
          sx={{
            display: { xs: sheetExpanded ? "flex" : "none", md: "flex" },
            flexDirection: "column",
            overflow: "hidden",
            // Narrow enough that the map is the page; the itinerary still fits its cards.
            width: { xs: 1, md: "32%", lg: "28%" },
            minWidth: { md: 300 },
            maxWidth: { md: 380 },
            maxHeight: { xs: "52dvh", md: "none" },
            borderTop: { xs: 1, md: 0 },
            borderLeft: { md: 1 },
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Box sx={{ display: showPlanning ? "flex" : "none", minHeight: 0, flex: 1, flexDirection: "column" }}>
            {dashboard && !data && !editPlanOpen && <MyDayPanel data={dashboard} />}
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
              area={area}
              blockedReason={blockedReason}
              opportunity={opportunity}
              ctaLabel={ctaLabel}
              onNewPlan={newPlan}
              onChangeStart={() => setChangingStart(true)}
              changingStart={changingStart}
              buildEnabled={buildEnabled}
              submitRadiusKm={submitRadius}
              hasStart={started}
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
          </Box>
          {!showPlanning && data && data.routeSummary ? (
            <>
              <Box
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: "background.default",
                  px: 4,
                  py: 3,
                }}
              >
                <Typography variant="eyebrow" component="h2">
                  Itinerary
                </Typography>
                <Button size="small" variant="text" onClick={() => setEditPlanOpen(true)} sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                  Edit plan
                </Button>
              </Box>
              <Itinerary
                stops={displayStops}
                dayStartClock={data.routeSummary.dayStartClock}
                startLabel={start?.label ?? startText}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onViewBrief={
                  SHOW_PRE_VISIT_BRIEF
                    ? (id) => {
                        setSelectedId(id);
                        setBriefId(id);
                      }
                    : undefined
                }
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
                visitedNearby={data.result.visitedNearby}
              />
              {privileged && <Diagnostics data={data} />}
            </>
          ) : !showPlanning && pending ? (
            <ItinerarySkeleton />
          ) : null}
        </Box>
      </Box>

      {/* Pre-visit brief: centred modal on desktop, bottom sheet on phones */}
      <Dialog
        open={displayBrief != null}
        onClose={() => setBriefId(null)}
        fullWidth
        maxWidth={false}
        scroll="paper"
        aria-labelledby="nv-brief-title"
        sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }}
        slotProps={{
          paper: {
            className: "nv-scroll",
            sx: {
              width: 1,
              maxWidth: { xs: "100%", sm: 672 },
              maxHeight: "94dvh",
              m: { xs: 0, sm: 8 },
              overflowY: "auto",
              borderTopLeftRadius: 2,
              borderTopRightRadius: 2,
              borderBottomLeftRadius: { xs: 0, sm: 2 },
              borderBottomRightRadius: { xs: 0, sm: 2 },
              borderWidth: { xs: 0, sm: 1 },
              borderTopWidth: 1,
            },
          },
        }}
      >
        {displayBrief && (
          <PreVisitBriefView
            brief={displayBrief}
            arrivalClock={planAdjusted ? null : (briefRoute?.arrivalClock ?? null)}
            onClose={() => setBriefId(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={newPlanConfirmOpen}
        onClose={() => setNewPlanConfirmOpen(false)}
        title="Start a new plan?"
        description="Today's route will be cleared from this screen."
        confirmLabel="New plan"
        onConfirm={resetPlan}
      />
    </Box>
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
  return (
    <Tooltip title={title}>
      <StatusChip tone={tone === "accent" ? "primary" : tone === "signal" ? "warning" : "neutral"} label={label} sx={{ flexShrink: 0 }} />
    </Tooltip>
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
    <Paper
      variant="outlined"
      role="status"
      sx={{
        position: "absolute",
        top: 3,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: MAP_Z.banner,
        display: "flex",
        alignItems: "center",
        gap: 2,
        maxWidth: "calc(100% - 24px)",
        px: 3.5,
        py: 2,
        borderRadius: 1.5,
        boxShadow: 3,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {text}
      </Typography>
      {actions.map((a) => (
        <Button key={a.label} size="small" variant={a.primary ? "contained" : "outlined"} onClick={a.onClick} sx={{ flexShrink: 0, fontWeight: 600 }}>
          {a.label}
        </Button>
      ))}
    </Paper>
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
    <Box
      className="nv-fade-in"
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: MAP_Z.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(var(--nv-palette-background-defaultChannel) / 0.6)",
        backdropFilter: "blur(2px)",
      }}
    >
      <Paper className="nv-fade-up" variant="outlined" sx={{ width: 290, display: "flex", flexDirection: "column", alignItems: "center", px: 6, py: 5, borderRadius: 1.5, boxShadow: 3 }}>
        <CircularProgress size={20} thickness={4} />
        <Typography variant="body2" sx={{ mt: 3, fontWeight: 600 }}>
          Building your day
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, minHeight: 16, color: "text.secondary" }} aria-live="polite">
          {BUILD_STAGES[stage]}
        </Typography>
      </Paper>
    </Box>
  );
}

function ItinerarySkeleton() {
  return (
    <Box sx={{ px: 4, py: 4 }} aria-hidden>
      <Skeleton variant="rounded" width={80} height={12} sx={{ mb: 4 }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Box key={i} sx={{ mb: 3, display: "flex", gap: 3, opacity: 1 - i * 0.15 }}>
          <Skeleton variant="circular" width={28} height={28} sx={{ mt: 1, flexShrink: 0 }} />
          <Paper variant="outlined" sx={{ minWidth: 0, flex: 1, px: 3.5, py: 3 }}>
            <Skeleton variant="rounded" width="66%" height={14} />
            <Skeleton variant="rounded" width="33%" height={12} sx={{ mt: 2 }} />
          </Paper>
        </Box>
      ))}
    </Box>
  );
}
