"use client";

/**
 * Legacy form-first planner. Today uses PlanningWorkspace (Phase 8.8).
 * Kept for reference; not mounted in the app shell.
 */

import { useState, type RefObject } from "react";
import type { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import type { GeoPoint } from "@/domain/geo";
import { serializeWorkingArea, polygonAreaKm2 } from "@/domain/geo/workingArea";
import {
  GEOLOCATION_UNAVAILABLE_MESSAGE,
  geolocationSelection,
  type StartSelection,
} from "@/lib/placeSelection";
import { StartLocationField } from "./StartLocationField";

type ProvinceOption = (typeof CANADIAN_PROVINCES)[number];

export function PlannerPanel({
  open,
  onClose,
  formAction,
  pending,
  error,
  provinces,
  province,
  onProvinceChange,
  formRef,
  googleEnabled,
  startText,
  onStartTextChange,
  startOverride,
  onResolvedStart,
  onRequestDropPin,
  onRequestDrawArea,
  workingArea,
  onClearWorkingArea,
}: {
  open: boolean;
  onClose: () => void;
  formAction: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
  provinces: ProvinceOption[];
  province: string;
  onProvinceChange: (code: string) => void;
  formRef: RefObject<HTMLFormElement | null>;
  googleEnabled: boolean;
  startText: string;
  onStartTextChange: (text: string) => void;
  startOverride: StartSelection | null;
  onResolvedStart: (selection: StartSelection | null) => void;
  onRequestDropPin: () => void;
  onRequestDrawArea: () => void;
  workingArea: GeoPoint[];
  onClearWorkingArea: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [fit, setFit] = useState(3);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(false);

  // User-initiated, one-shot geolocation only — no tracking (privacy rule).
  const useMyLocation = () => {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(GEOLOCATION_UNAVAILABLE_MESSAGE);
      return;
    }
    setGeoPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoPending(false);
        const sel = geolocationSelection(pos.coords.latitude, pos.coords.longitude);
        onStartTextChange(sel.label);
        onResolvedStart(sel);
      },
      () => {
        setGeoPending(false);
        setGeoError(GEOLOCATION_UNAVAILABLE_MESSAGE);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const sourceLabel =
    startOverride?.source === "search"
      ? "Google place"
      : startOverride?.source === "geolocation"
        ? "current location"
        : startOverride?.source === "map-pin"
          ? "dropped pin"
          : null;

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close planner"
          onClick={onClose}
          className="fixed inset-0 z-[1090] bg-ink/30 md:hidden"
        />
      )}
      <div
        className={`${
          open ? "" : "hidden"
        } fixed inset-x-3 top-16 bottom-3 z-[1100] flex flex-col overflow-hidden rounded-xl border border-rule bg-panel shadow-float md:absolute md:inset-auto md:top-4 md:left-4 md:max-h-[calc(100%-2rem)] md:w-[350px]`}
      >
        <div className="flex items-center justify-between border-b border-rule-soft px-5 py-3.5">
          <h2 className="text-[13px] font-semibold tracking-tight text-ink">Plan today&rsquo;s route</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <form
          ref={formRef}
          action={formAction}
          className="nv-scroll flex-1 space-y-5 overflow-y-auto px-5 py-4"
        >
          {/* Exact client-selected coordinates (Places / pin / geolocation) */}
          <input type="hidden" name="startLat" value={startOverride?.lat ?? ""} />
          <input type="hidden" name="startLng" value={startOverride?.lng ?? ""} />
          <input type="hidden" name="startPlaceId" value={startOverride?.placeId ?? ""} />
          <input type="hidden" name="startLabel" value={startOverride?.label ?? ""} />
          <input
            type="hidden"
            name="workingAreaJson"
            value={workingArea.length >= 3 ? serializeWorkingArea(workingArea) : ""}
          />

          <Group label="Territory">
            <Field label="Province">
              <select
                name="provinceCode"
                value={province}
                onChange={(e) => onProvinceChange(e.target.value)}
                required
                className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
              >
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start location" hint={googleEnabled ? "Google search" : "Address or postal"}>
              <StartLocationField
                googleEnabled={googleEnabled}
                value={startText}
                onValueChange={onStartTextChange}
                onResolvedStart={onResolvedStart}
              />
            </Field>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={geoPending}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rule bg-paper text-xs font-medium text-ink hover:bg-canvas disabled:opacity-60"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
                </svg>
                {geoPending ? "Locating…" : "Use my location"}
              </button>
              <button
                type="button"
                onClick={onRequestDropPin}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-rule bg-paper text-xs font-medium text-ink hover:bg-canvas"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                Drop pin on map
              </button>
            </div>
            {geoError && <p className="text-[0.72rem] leading-relaxed text-signal">{geoError}</p>}
            {startOverride && (
              <p className="flex items-start gap-1.5 text-[0.72rem] leading-relaxed text-accent">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="mt-0.5 shrink-0">
                  <path d="m5 13 4 4 10-10" />
                </svg>
                Exact start set from {sourceLabel}
                {startOverride.placeId ? " (Place ID retained)" : ""}
              </p>
            )}

            <Field label="Working area" hint="Optional">
              {workingArea.length >= 3 ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-paper px-3 py-2">
                  <span className="text-xs text-ink">
                    Area set · {workingArea.length} points
                    {polygonAreaKm2(workingArea) > 0
                      ? ` · ~${formatKm2(polygonAreaKm2(workingArea))}`
                      : ""}{" "}
                    — only clinics inside are planned
                  </span>
                  <button
                    type="button"
                    onClick={onClearWorkingArea}
                    className="text-xs font-medium text-danger hover:underline"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onRequestDrawArea}
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-rule bg-paper text-xs font-medium text-muted hover:bg-canvas hover:text-ink"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6 12 3l8 3-2 12-6 3-6-3L4 6Z" />
                  </svg>
                  Draw area on map
                </button>
              )}
            </Field>
          </Group>

          <Group label="Day plan">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Day start">
                <input
                  name="dayStartClock"
                  type="time"
                  defaultValue="09:00"
                  className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
                />
              </Field>
              <Field label="Day end">
                <input
                  name="dayEndClock"
                  type="time"
                  defaultValue="17:00"
                  className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
                />
              </Field>
            </div>
            <Field label="Target visits">
              <input
                name="dailyVisitTarget"
                type="number"
                defaultValue={20}
                min={1}
                max={50}
                className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
              />
            </Field>
          </Group>

          <Group label="Travel limits">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max drive" hint="Minutes, one-way">
                <input
                  name="maxDriveMinutes"
                  type="number"
                  placeholder="60"
                  min={1}
                  max={300}
                  className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink placeholder:text-faint"
                />
              </Field>
              <Field label="Max radius" hint="Kilometres">
                <input
                  name="maxRadiusKm"
                  type="number"
                  defaultValue={40}
                  min={1}
                  max={500}
                  className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
                />
              </Field>
            </div>
          </Group>

          <Group label="Qualification">
            <Field label="Minimum fit score">
              <input type="hidden" name="minFitScore" value={fit} />
              <div className="grid grid-cols-5 overflow-hidden rounded-lg border border-rule" role="radiogroup" aria-label="Minimum fit score">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={fit === n}
                    onClick={() => setFit(n)}
                    className={`h-10 text-sm font-medium transition-colors ${
                      fit === n
                        ? "bg-accent text-white"
                        : "bg-paper text-muted hover:bg-canvas hover:text-ink"
                    } ${n > 1 ? "border-l border-rule" : ""}`}
                  >
                    {n}+
                  </button>
                ))}
              </div>
            </Field>
          </Group>

          <div>
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className={`transition-transform ${advancedOpen ? "rotate-90" : ""}`}
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
              Advanced — visited &amp; revisits
            </button>
            {advancedOpen && (
              <div className="mt-3 space-y-3">
                <Field label="Already visited / not due" hint='One name per line, or "none"'>
                  <textarea
                    name="alreadyVisitedRaw"
                    defaultValue="none"
                    rows={3}
                    className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-xs text-ink"
                  />
                </Field>
                <Field label="Revisits due today" hint='One name per line, or "none"'>
                  <textarea
                    name="revisitsDueRaw"
                    defaultValue="none"
                    rows={3}
                    className="w-full rounded-lg border border-rule bg-paper px-3 py-2 text-xs text-ink"
                  />
                </Field>
              </div>
            )}
            {!advancedOpen && (
              <>
                {/* Keep values submitted while collapsed */}
                <input type="hidden" name="alreadyVisitedRaw" value="none" />
                <input type="hidden" name="revisitsDueRaw" value="none" />
              </>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-danger/25 bg-danger-tint px-3.5 py-2.5 text-xs leading-relaxed text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-lg bg-accent text-[13px] font-semibold tracking-[0.08em] text-white uppercase transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Building route…" : "Build today's route"}
          </button>
        </form>
      </div>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-[0.66rem] font-semibold tracking-[0.16em] text-faint uppercase">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs font-medium text-ink">
        {label}
        {hint ? <span className="text-[0.68rem] font-normal text-faint">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function formatKm2(n: number): string {
  if (n >= 10) return `${Math.round(n)} km²`;
  return `${n.toFixed(1)} km²`;
}
