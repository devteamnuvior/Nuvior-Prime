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
import { Disclosure } from "@/components/feedback/Disclosure";
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
import { clockOptions } from "@/lib/format";
import {
  TRAVEL_REACH_PRESETS,
  travelReachLabel,
  type AreaStrategy,
  type TravelReachMinutes,
} from "@/domain/planning/travelReach";
import type { PlannerPhase } from "@/domain/planning/plannerState";
import type { OpportunitySummary } from "@/domain/planning/opportunity";
import { Segmented } from "./Segmented";

type ProvinceOption = (typeof CANADIAN_PROVINCES)[number];

const TIMES = clockOptions();

/**
 * Location-first planning panel. The rep shares where they are and the day is
 * built around it: ten clinics within the default travel reach, skipping any the
 * team visited recently. Day hours, reach and the rest live under "Edit plan".
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
  onSelectReach,
  driveHonest,
  dayStart,
  dayEnd,
  onDayStart,
  onDayEnd,
  target,
  onTarget,
  radiusOverride,
  onRadiusOverride,
  driveOverride,
  onDriveOverride,
  alreadyVisited,
  onAlreadyVisited,
  revisitsDue,
  onRevisitsDue,
  blockedReason,
  opportunity,
  ctaLabel,
  onNewPlan,
  onChangeStart,
  changingStart,
  buildEnabled,
  submitRadiusKm,
  submitDriveMinutes,
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
  onSelectReach: (minutes: TravelReachMinutes) => void;
  driveHonest: boolean;
  dayStart: string;
  dayEnd: string;
  onDayStart: (v: string) => void;
  onDayEnd: (v: string) => void;
  target: number;
  onTarget: (n: number) => void;
  radiusOverride: number | null;
  onRadiusOverride: (n: number | null) => void;
  driveOverride: number | null;
  onDriveOverride: (n: number | null) => void;
  alreadyVisited: string;
  onAlreadyVisited: (v: string) => void;
  revisitsDue: string;
  onRevisitsDue: (v: string) => void;
  blockedReason: string | null;
  opportunity: OpportunitySummary | null;
  ctaLabel: string;
  onNewPlan: () => void;
  onChangeStart: () => void;
  changingStart: boolean;
  buildEnabled: boolean;
  submitRadiusKm: number;
  submitDriveMinutes: number | null;
  hasStart: boolean;
  onPlanSomewhereElse?: () => void;
  canPlanSomewhereElse?: boolean;
  provinceError?: string | null;
}) {
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
      <input type="hidden" name="dailyVisitTarget" value={target} />
      <input type="hidden" name="dayStartClock" value={dayStart} />
      <input type="hidden" name="dayEndClock" value={dayEnd} />
      <input type="hidden" name="maxDriveMinutes" value={submitDriveMinutes ?? ""} />
      <input type="hidden" name="maxRadiusKm" value={submitRadiusKm} />
      <input type="hidden" name="alreadyVisitedRaw" value={alreadyVisited} />
      <input type="hidden" name="revisitsDueRaw" value={revisitsDue} />

      <Box className="nv-scroll" sx={{ flex: 1, overflowY: "auto", px: { xs: 4, sm: 5 }, py: 4, display: "flex", flexDirection: "column", gap: 5 }}>
        {/* ---- Start ---- */}
        {!hasStart || changingStart ? (
          <Box component="section">
            <Typography variant="h3" component="h2">
              Where are you right now?
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", lineHeight: 1.6 }}>
              Share your location and we&rsquo;ll line up today&rsquo;s {target} clinics around you — skipping any the team has visited recently.
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
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 3 }}>
              <TextField select label="Day start" value={dayStart} onChange={(e) => onDayStart(e.target.value)} slotProps={TIME_MENU}>
                {TIMES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Day end" value={dayEnd} onChange={(e) => onDayEnd(e.target.value)} slotProps={TIME_MENU}>
                {TIMES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              label="Clinics today"
              type="number"
              value={target}
              onChange={(e) => onTarget(Number(e.target.value))}
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
            />
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

        {hasStart && (
          <Disclosure label="Advanced planning" open={advancedOpen} onToggle={setAdvancedOpen} contentSx={{ pt: 3 }}>
            <Stack spacing={3}>
              <Box>
                <FieldLabel>Travel reach</FieldLabel>
                <Segmented
                  ariaLabel="Travel reach"
                  height={44}
                  value={area.kind === "travel-reach" ? area.minutes : null}
                  options={TRAVEL_REACH_PRESETS.map((m) => ({ value: m, label: `${m} min` }))}
                  onChange={(m) => onSelectReach(m)}
                />
                {area.kind === "travel-reach" && (
                  <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary", lineHeight: 1.6 }}>
                    {travelReachLabel(area.minutes)}
                    {driveHonest
                      ? " — a drive-time limit for today’s route, not a drawn road boundary."
                      : " — drive times are estimated in this mode; a true road-time boundary is not shown."}
                  </Typography>
                )}
              </Box>
              <TextField
                label="Search radius (km)"
                type="number"
                value={radiusOverride ?? ""}
                placeholder="Auto"
                onChange={(e) => onRadiusOverride(e.target.value === "" ? null : Number(e.target.value))}
                slotProps={{ htmlInput: { min: 1, max: 500 }, inputLabel: { shrink: true } }}
              />
              <TextField
                label="Max one-way drive (min)"
                type="number"
                value={driveOverride ?? ""}
                placeholder={area.kind === "travel-reach" ? String(area.minutes) : "None"}
                onChange={(e) => onDriveOverride(e.target.value === "" ? null : Number(e.target.value))}
                slotProps={{ htmlInput: { min: 1, max: 300 }, inputLabel: { shrink: true } }}
              />
              <TextField
                label="Already visited / not due"
                multiline
                minRows={2}
                value={alreadyVisited}
                onChange={(e) => onAlreadyVisited(e.target.value)}
              />
              <TextField
                label="Revisits due today"
                multiline
                minRows={2}
                value={revisitsDue}
                onChange={(e) => onRevisitsDue(e.target.value)}
              />
              <Typography variant="caption" sx={{ color: "text.faint", lineHeight: 1.6 }}>
                Each clinic is planned as a 45-minute slot; lunch uses the routing default (12:00–2:00 PM).
              </Typography>
            </Stack>
          </Disclosure>
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

/** Caption-weight label above a control that has no MUI label of its own (segmented groups). */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" component="p" sx={{ mb: 1.5, fontWeight: 500, color: "text.primary" }}>
      {children}
    </Typography>
  );
}

/** Tall option lists (15-minute clock) scroll inside the menu instead of covering the panel. */
const TIME_MENU = { select: { MenuProps: { slotProps: { paper: { sx: { maxHeight: 320 } } } } } } as const;

/** Placeholder for future saved working-area presets — not a completion requirement. */
export const SAVED_AREA_PRESETS: { id: string; name: string; points: GeoPoint[] }[] = [];
