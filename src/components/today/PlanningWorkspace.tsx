"use client";

import { useState, type RefObject } from "react";
import type { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import type { GeoPoint } from "@/domain/geo";
import { polygonAreaKm2, serializeWorkingArea, validateDrawnArea } from "@/domain/geo/workingArea";
import {
  applyGeocodeToStart,
  canCommitTypedStart,
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
import { StartLocationField } from "./StartLocationField";

type ProvinceOption = (typeof CANADIAN_PROVINCES)[number];

const TIMES = clockOptions();

/**
 * Compact map-first planning panel. Geography is primary; the form is a
 * secondary control surface that submits the existing generateVisitListAction.
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
  onRequestDrawArea,
  onClearArea,
  area,
  onSelectReach,
  areaError,
  driveHonest,
  dayStart,
  dayEnd,
  onDayStart,
  onDayEnd,
  target,
  onTarget,
  minFit,
  onMinFit,
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
  onCommitTextStart,
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
  onRequestDrawArea: () => void;
  onClearArea: () => void;
  area: AreaStrategy;
  onSelectReach: (minutes: TravelReachMinutes) => void;
  areaError: string | null;
  driveHonest: boolean;
  dayStart: string;
  dayEnd: string;
  onDayStart: (v: string) => void;
  onDayEnd: (v: string) => void;
  target: number;
  onTarget: (n: number) => void;
  minFit: number;
  onMinFit: (n: number) => void;
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
  onCommitTextStart: () => void;
  onPlanSomewhereElse?: () => void;
  canPlanSomewhereElse?: boolean;
  provinceError?: string | null;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
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

  const drawnKm2 = area.kind === "drawn" && area.points.length >= 3 ? polygonAreaKm2(area.points) : 0;

  return (
    <form ref={formRef} action={formAction} className="flex min-h-0 flex-1 flex-col" data-planner-phase={phase}>
      <input type="hidden" name="startQuery" value={startText || start?.label || "start"} />
      <input type="hidden" name="startLat" value={start?.lat ?? ""} />
      <input type="hidden" name="startLng" value={start?.lng ?? ""} />
      <input type="hidden" name="startPlaceId" value={start?.placeId ?? ""} />
      <input type="hidden" name="startLabel" value={start?.label ?? ""} />
      <input type="hidden" name="provinceCode" value={province} />
      <input type="hidden" name="workingAreaJson" value={workingAreaJson} />
      <input type="hidden" name="dailyVisitTarget" value={target} />
      <input type="hidden" name="minFitScore" value={minFit} />
      <input type="hidden" name="dayStartClock" value={dayStart} />
      <input type="hidden" name="dayEndClock" value={dayEnd} />
      <input type="hidden" name="maxDriveMinutes" value={submitDriveMinutes ?? ""} />
      <input type="hidden" name="maxRadiusKm" value={submitRadiusKm} />
      <input type="hidden" name="alreadyVisitedRaw" value={alreadyVisited} />
      <input type="hidden" name="revisitsDueRaw" value={revisitsDue} />

      <div className="nv-scroll flex-1 space-y-5 overflow-y-auto px-4 py-4 md:px-5">
        {/* ---- Start ---- */}
        {!hasStart || changingStart ? (
          <section>
            <h2 className="text-[15px] font-semibold text-ink">Where are you starting today?</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Choose your starting point. We&rsquo;ll build the day around it.
            </p>
            <div className="mt-4 grid gap-2">
              <ActionRow onClick={useMyLocation} disabled={geoPending} primary>
                {geoPending ? "Locating…" : "Use my location"}
              </ActionRow>
              <ActionRow onClick={() => setSearchOpen((v) => !v)}>Search</ActionRow>
              <ActionRow onClick={onRequestDropPin}>Drop a pin</ActionRow>
            </div>
            {searchOpen && (
              <div className="mt-3">
                <StartLocationField
                  googleEnabled={googleEnabled}
                  value={startText}
                  onValueChange={onStartTextChange}
                  onResolvedStart={(sel) => {
                    onResolvedStart(sel);
                    if (sel) setSearchOpen(false);
                  }}
                />
                {canCommitTypedStart(startText, start) && (
                  <button
                    type="button"
                    onClick={() => {
                      onCommitTextStart();
                      setSearchOpen(false);
                    }}
                    className="mt-2 h-9 w-full rounded-lg border border-rule bg-paper text-xs font-semibold text-ink hover:bg-canvas"
                  >
                    Use this address
                  </button>
                )}
              </div>
            )}
            {geoError && <p className="mt-2 text-[0.72rem] leading-relaxed text-signal">{geoError}</p>}
            {provinceError && (
              <div className="mt-3 rounded-lg border border-signal/25 bg-signal-tint px-3 py-2.5">
                <p className="text-[0.72rem] leading-relaxed text-signal">{provinceError}</p>
                {canPlanSomewhereElse && onPlanSomewhereElse && (
                  <button
                    type="button"
                    onClick={onPlanSomewhereElse}
                    className="mt-2 text-xs font-semibold text-ink hover:underline"
                  >
                    Plan somewhere else
                  </button>
                )}
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[0.66rem] font-semibold tracking-[0.16em] text-faint uppercase">Start</div>
                <p className="mt-0.5 truncate text-sm font-medium text-ink">{start?.label ?? startText}</p>
              </div>
              <button
                type="button"
                onClick={onChangeStart}
                className="shrink-0 text-xs font-medium text-muted hover:text-ink"
              >
                Change start
              </button>
            </div>
            {provinceError && (
              <div className="mt-3 rounded-lg border border-signal/25 bg-signal-tint px-3 py-2.5">
                <p className="text-[0.72rem] leading-relaxed text-signal">{provinceError}</p>
                {canPlanSomewhereElse && onPlanSomewhereElse && (
                  <button
                    type="button"
                    onClick={onPlanSomewhereElse}
                    className="mt-2 text-xs font-semibold text-ink hover:underline"
                  >
                    Plan somewhere else
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {showProvincePicker && hasStart && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink">Province</span>
            <select
              value={province}
              onChange={(e) => onProvinceChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
            >
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </label>
        )}

        {/* ---- Area ---- */}
        {hasStart && (
          <section>
            <div className="text-[0.66rem] font-semibold tracking-[0.16em] text-faint uppercase">
              Today&rsquo;s area
            </div>
            <p className="mt-1 text-[13px] text-muted">Where do you want to work today?</p>

            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-ink">Travel reach</p>
              <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-rule">
                {TRAVEL_REACH_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSelectReach(m)}
                    className={`h-11 text-sm font-medium ${
                      area.kind === "travel-reach" && area.minutes === m
                        ? "bg-accent text-white"
                        : "bg-paper text-muted hover:bg-canvas hover:text-ink"
                    } ${m !== 30 ? "border-l border-rule" : ""}`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
              {area.kind === "travel-reach" && (
                <p className="mt-2 text-[0.72rem] leading-relaxed text-muted">
                  {travelReachLabel(area.minutes)}
                  {driveHonest
                    ? " — a drive-time limit for today&rsquo;s route, not a drawn road boundary."
                    : " — drive times are estimated in this mode; a true road-time boundary is not shown."}
                </p>
              )}
            </div>

            <div className="mt-3">
              {area.kind === "drawn" && validateDrawnArea(area.points).ok ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-paper px-3 py-2.5">
                  <span className="text-xs text-ink">
                    Today&rsquo;s area · {drawnKm2 >= 10 ? Math.round(drawnKm2) : drawnKm2.toFixed(1)} km²
                  </span>
                  <span className="flex gap-3">
                    <button type="button" onClick={onRequestDrawArea} className="text-xs font-medium text-ink hover:underline">
                      Edit
                    </button>
                    <button type="button" onClick={onClearArea} className="text-xs font-medium text-danger hover:underline">
                      Clear
                    </button>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onRequestDrawArea}
                  className="flex h-11 w-full items-center justify-center rounded-lg border border-dashed border-rule bg-paper text-xs font-medium text-muted hover:bg-canvas hover:text-ink"
                >
                  Draw today&rsquo;s area
                </button>
              )}
              <p className="mt-1.5 text-[0.68rem] text-faint">
                Can&rsquo;t draw? Use travel reach above.
              </p>
              <p className="mt-1 text-[0.68rem] text-faint">
                Saved areas (later): Downtown Toronto, North York, Mississauga West.
              </p>
            </div>
            {areaError && <p className="mt-2 text-[0.72rem] leading-relaxed text-signal">{areaError}</p>}
          </section>
        )}

        {/* ---- Day controls ---- */}
        {hasStart && area.kind !== "none" && (
          <section className="space-y-3">
            <div className="text-[0.66rem] font-semibold tracking-[0.16em] text-faint uppercase">Day</div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink">Day start</span>
                <select
                  value={dayStart}
                  onChange={(e) => onDayStart(e.target.value)}
                  className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
                >
                  {TIMES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink">Day end</span>
                <select
                  value={dayEnd}
                  onChange={(e) => onDayEnd(e.target.value)}
                  className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
                >
                  {TIMES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink">Target visits</span>
              <input
                type="number"
                min={1}
                max={50}
                value={target}
                onChange={(e) => onTarget(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
              />
            </label>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-ink">Minimum fit</span>
              <div className="grid grid-cols-5 overflow-hidden rounded-lg border border-rule">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onMinFit(n)}
                    className={`h-10 text-sm font-medium ${
                      minFit === n ? "bg-accent text-white" : "bg-paper text-muted hover:bg-canvas hover:text-ink"
                    } ${n > 1 ? "border-l border-rule" : ""}`}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {opportunity && opportunity.qualified > 0 && (
          <section className="rounded-lg border border-rule-soft bg-canvas/60 px-3.5 py-3">
            <p className="text-sm font-semibold text-ink">
              {opportunity.qualified} qualified account{opportunity.qualified === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {[5, 4, 3, 2, 1]
                .filter((f) => opportunity.byFit[f as 1 | 2 | 3 | 4 | 5] > 0)
                .map((f) => `${opportunity.byFit[f as 1 | 2 | 3 | 4 | 5]} Fit ${f}`)
                .join(" · ")}
              {opportunity.revisitsDue > 0 ? ` · ${opportunity.revisitsDue} revisit${opportunity.revisitsDue === 1 ? "" : "s"} due` : ""}
            </p>
          </section>
        )}

        {hasStart && (
          <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${advancedOpen ? "rotate-90" : ""}`}>
              <path d="m9 6 6 6-6 6" />
            </svg>
            Advanced planning
          </button>
          {advancedOpen && (
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink">Search radius (km)</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={radiusOverride ?? ""}
                  placeholder="Auto"
                  onChange={(e) => onRadiusOverride(e.target.value === "" ? null : Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink">Max one-way drive (min)</span>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={driveOverride ?? ""}
                  placeholder={area.kind === "travel-reach" ? String(area.minutes) : "None"}
                  onChange={(e) => onDriveOverride(e.target.value === "" ? null : Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink">Already visited / not due</span>
                <textarea
                  rows={2}
                  value={alreadyVisited}
                  onChange={(e) => onAlreadyVisited(e.target.value)}
                  className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-xs text-ink"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-ink">Revisits due today</span>
                <textarea
                  rows={2}
                  value={revisitsDue}
                  onChange={(e) => onRevisitsDue(e.target.value)}
                  className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-xs text-ink"
                />
              </label>
              <p className="text-[0.68rem] leading-relaxed text-faint">
                Visit length and lunch use routing defaults (20 min visit, optional lunch 12:00–2:00 PM).
              </p>
            </div>
          )}
        </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-xs leading-relaxed text-danger">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-rule-soft px-4 py-3 md:px-5">
        {hasStart && area.kind !== "none" && (
          <button
            type="submit"
            disabled={pending || !buildEnabled}
            className="h-12 w-full rounded-lg bg-accent text-[13px] font-semibold tracking-[0.08em] text-white uppercase hover:bg-accent-hover disabled:opacity-45"
          >
            {pending ? "Building…" : ctaLabel}
          </button>
        )}
        {blockedReason && hasStart && !buildEnabled && (
          <p className="mt-2 text-center text-[0.72rem] text-muted">{blockedReason}</p>
        )}
        {buildEnabled && ctaLabel === "Build My Day" && (
          <p className="mt-2 text-center text-[0.72rem] text-faint">
            Find the highest-value feasible visits in today&rsquo;s area.
          </p>
        )}
        {hasStart && (
          <button
            type="button"
            onClick={onNewPlan}
            className="mt-2 h-9 w-full text-xs font-medium text-muted hover:text-ink"
          >
            New plan
          </button>
        )}
      </div>
    </form>
  );
}

function ActionRow({
  onClick,
  children,
  primary = false,
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-60 ${
        primary
          ? "bg-accent text-white hover:bg-accent-hover"
          : "border border-rule bg-paper text-ink hover:bg-canvas"
      }`}
    >
      {children}
    </button>
  );
}

/** Placeholder for future saved working-area presets — not a completion requirement. */
export const SAVED_AREA_PRESETS: { id: string; name: string; points: GeoPoint[] }[] = [];
