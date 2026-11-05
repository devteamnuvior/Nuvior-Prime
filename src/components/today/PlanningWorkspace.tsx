"use client";

import { useState, type RefObject } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import type { GeoPoint } from "@/domain/geo";
import { serializeWorkingArea, validateDrawnArea } from "@/domain/geo/workingArea";
import {
  applyGeocodeToStart,
  geolocationSelection,
  provinceFromAddressComponents,
  type StartSelection,
} from "@/lib/placeSelection";
import { requestBrowserLocation } from "@/lib/browserGeolocation";
import type { AreaStrategy } from "@/domain/planning/area";
import { DAILY_CLINIC_SLOTS, SLOT_MINUTES } from "@/domain/performance/visitSlots";
import type { PlannerPhase } from "@/domain/planning/plannerState";
import type { OpportunitySummary } from "@/domain/planning/opportunity";

type ProvinceOption = (typeof CANADIAN_PROVINCES)[number];

/**
 * Location-first planning panel. The rep shares where they are and the day is
 * built around it: the ten nearest qualified clinics, skipping any the team
 * visited recently. Nothing about the day is theirs to set: the count, the
 * hours and the search radius are fixed; drawing an outline on the map is the
 * one way to narrow where the clinics come from.
 */
export function PlanningWorkspace({
  phase,
  formAction,
  pending,
  error,
  formRef,
  googleEnabled,

  provinces,
  province,
  onProvinceChange,
  showProvincePicker,
  startText,
  onStartTextChange,
  start,
  onResolvedStart,
  onRequestDropPin,
  area,
  blockedReason,
  opportunity,
  ctaLabel,
  onNewPlan,
  onChangeStart,
  changingStart,
  buildEnabled,
  submitRadiusKm,
  hasStart,
  onPlanSomewhereElse,
  canPlanSomewhereElse,
  provinceError,
}: {
  phase: PlannerPhase;
  formAction: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
  formRef: RefObject<HTMLFormElement | null>;
  googleEnabled: boolean;
  provinces: ProvinceOption[];
  province: string;
  onProvinceChange: (code: string) => void;
  showProvincePicker: boolean;
  startText: string;
  onStartTextChange: (text: string) => void;
  start: StartSelection | null;
  onResolvedStart: (selection: StartSelection | null) => void;
  onRequestDropPin: () => void;
  area: AreaStrategy;
  blockedReason: string | null;
  opportunity: OpportunitySummary | null;
  ctaLabel: string;
  onNewPlan: () => void;
  onChangeStart: () => void;
  changingStart: boolean;
  buildEnabled: boolean;
  submitRadiusKm: number;
  hasStart: boolean;
  onPlanSomewhereElse?: () => void;
  canPlanSomewhereElse?: boolean;
  provinceError?: string | null;
}) {
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(false);

  const useMyLocation = async () => {
    setGeoError(null);
    setGeoPending(true);
    const result = await requestBrowserLocation(
      typeof navigator !== "undefined" ? navigator.geolocation : null,
    );
    if (!result.ok) {
      setGeoPending(false);
      setGeoError(result.message);
      return;
    }
    let sel = geolocationSelection(result.lat, result.lng);
    if (googleEnabled && typeof google !== "undefined" && google.maps?.Geocoder) {
      try {
        const geocoder = new google.maps.Geocoder();
        const res = await geocoder.geocode({
          location: { lat: result.lat, lng: result.lng },
        });
        const first = res.results[0];
        if (first) {
          const parsed = provinceFromAddressComponents(first.address_components ?? []);
          sel = applyGeocodeToStart(sel, {
            formattedAddress: first.formatted_address,
            provinceCode: parsed.provinceCode,
            postalCode: parsed.postalCode,
          });
        }
      } catch {
        /* keep coordinate label — geocode is optional */
      }
    }
    setGeoPending(false);
    onStartTextChange(sel.label);
    onResolvedStart(sel);
  };

  const workingAreaJson =
    area.kind === "drawn" && validateDrawnArea(area.points).ok ? serializeWorkingArea(area.points) : "";

  const provinceNote = provinceError ? (
    <Alert
      severity="warning"
      icon={false}
      sx={{ mt: 3 }}
      action={
        canPlanSomewhereElse && onPlanSomewhereElse ? (
          <Button size="small" color="inherit" onClick={onPlanSomewhereElse} sx={{ fontWeight: 600 }}>
            Plan somewhere else
          </Button>
        ) : undefined
      }
    >
      {provinceError}
    </Alert>
  ) : null;

  return (
    <Box
      component="form"
      ref={formRef}
      action={formAction}
      data-planner-phase={phase}
      sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}
    >
      <input type="hidden" name="startQuery" value={startText || start?.label || "start"} />
      <input type="hidden" name="startLat" value={start?.lat ?? ""} />
      <input type="hidden" name="startLng" value={start?.lng ?? ""} />
      <input type="hidden" name="startPlaceId" value={start?.placeId ?? ""} />
      <input type="hidden" name="startLabel" value={start?.label ?? ""} />
      <input type="hidden" name="provinceCode" value={province} />
      <input type="hidden" name="workingAreaJson" value={workingAreaJson} />
      <input type="hidden" name="maxRadiusKm" value={submitRadiusKm} />

      <Box className="nv-scroll" sx={{ flex: 1, overflowY: "auto", px: { xs: 4, sm: 5 }, py: 4, display: "flex", flexDirection: "column", gap: 5 }}>
        {/* ---- Start ---- */}
        {!hasStart || changingStart ? (
          <Box component="section">
            <Typography variant="h3" component="h2">
              Where are you right now?
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", lineHeight: 1.6 }}>
              Share your location and we&rsquo;ll line up today&rsquo;s {DAILY_CLINIC_SLOTS} clinics around you — skipping any the team has visited recently.
            </Typography>
            <Stack spacing={2} sx={{ mt: 4 }}>
              <Button variant="contained" size="large" fullWidth onClick={useMyLocation} disabled={geoPending}>
                {geoPending ? "Locating…" : "Use my location"}
              </Button>
              <Button variant="outlined" size="large" fullWidth onClick={onRequestDropPin}>
                Drop a pin on the map
              </Button>
            </Stack>
            {geoError && (
              <Typography variant="caption" sx={{ display: "block", mt: 2, color: "warning.main", lineHeight: 1.6 }}>
                {geoError}
              </Typography>
            )}
            {provinceNote}
          </Box>
        ) : (
          <Box component="section">
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="eyebrow" component="h2" sx={{ display: "block" }}>
                  Start
                </Typography>
                <Typography variant="body1" noWrap sx={{ mt: 0.5, fontWeight: 500 }}>
                  {start?.label ?? startText}
                </Typography>
              </Box>
              <Button size="small" variant="text" onClick={onChangeStart} sx={{ flexShrink: 0, color: "text.secondary", "&:hover": { color: "text.primary" } }}>
                Change start
              </Button>
            </Box>
            {provinceNote}
          </Box>
        )}

        {showProvincePicker && hasStart && (
          <TextField
            select
            label="Province"
            value={province}
            onChange={(e) => onProvinceChange(e.target.value)}
            fullWidth
          >
            {provinces.map((p) => (
              <MenuItem key={p.code} value={p.code}>
                {p.name} ({p.code})
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* ---- Day controls ---- */}
        {hasStart && area.kind !== "none" && (
          <Box component="section" sx={{ display: "grid", gap: 3 }}>
            <Typography variant="eyebrow" component="h2" sx={{ display: "block" }}>
              Day
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
              {DAILY_CLINIC_SLOTS} clinics, {SLOT_MINUTES} minutes each — the same day for every rep. The hours work themselves out around the route.
            </Typography>
          </Box>
        )}

        {opportunity && opportunity.qualified > 0 && (
          <Paper component="section" variant="outlined" sx={{ px: 3.5, py: 3, bgcolor: "background.sunken" }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {opportunity.qualified} qualified account{opportunity.qualified === 1 ? "" : "s"}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
              {opportunity.revisitsDue > 0 ? `${opportunity.revisitsDue} revisit${opportunity.revisitsDue === 1 ? "" : "s"} due` : "Within reach of your start"}
            </Typography>
          </Paper>
        )}

        {error && (
          <Alert severity="error" icon={false}>
            {error}
          </Alert>
        )}
      </Box>

      <Box sx={{ borderTop: 1, borderColor: "divider", px: { xs: 4, sm: 5 }, py: 3 }}>
        {hasStart && area.kind !== "none" && (
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={pending || !buildEnabled}
            sx={{ minHeight: 48, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            {pending ? "Building…" : ctaLabel}
          </Button>
        )}
        {blockedReason && hasStart && !buildEnabled && (
          <Typography variant="caption" sx={{ display: "block", mt: 2, textAlign: "center", color: "text.secondary" }}>
            {blockedReason}
          </Typography>
        )}
        {buildEnabled && ctaLabel === "Build My Day" && (
          <Typography variant="caption" sx={{ display: "block", mt: 2, textAlign: "center", color: "text.faint" }}>
            The nearest qualified clinics around you, minus any the team visited in the last 90 days.
          </Typography>
        )}
        {hasStart && (
          <Button variant="text" size="small" fullWidth onClick={onNewPlan} sx={{ mt: 2, color: "text.secondary", "&:hover": { color: "text.primary" } }}>
            New plan
          </Button>
        )}
      </Box>
    </Box>
  );
}

/** Placeholder for future saved working-area presets — not a completion requirement. */
export const SAVED_AREA_PRESETS: { id: string; name: string; points: GeoPoint[] }[] = [];
