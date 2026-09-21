"use client";

import { useEffect, useRef } from "react";
import { clock12, duration, km } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";
import type { DisplayStop } from "./manualPlan";
import { IntelligenceItineraryBadge } from "@/components/intelligence/ClinicIntelligenceSection";
import type { ClinicIntelligenceDto } from "@/domain/intelligence/clinicIntelligenceDto";

export function Itinerary({
  stops,
  dayStartClock,
  startLabel,
  selectedId,
  onSelect,
  onViewBrief,
  hoveredId,
  onHover,
  adjusted,
  removedCount,
  onMove,
  onRemove,
  onResetPlan,
  intelligenceByAccountId,
}: {
  stops: DisplayStop[];
  dayStartClock: string;
  startLabel: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onViewBrief: (id: string) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  /** True when the rep reordered/removed stops — optimized times no longer apply. */
  adjusted: boolean;
  removedCount: number;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onResetPlan: () => void;
  intelligenceByAccountId?: Record<string, ClinicIntelligenceDto>;
}) {
  // Map/list choreography: selecting a marker scrolls its card into view.
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current
      .get(selectedId)
      ?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selectedId]);

  return (
    <>
      {adjusted && (
        <div className="nv-fade-in mx-4 mt-3 flex items-start justify-between gap-3 rounded-lg border border-signal/25 bg-signal-tint px-3.5 py-2.5">
          <p className="text-xs leading-relaxed text-signal">
            Manually adjusted plan{removedCount > 0 ? ` · ${removedCount} removed` : ""}. Arrival
            times and drive legs will recalculate when you rebuild the route.
          </p>
          <button
            type="button"
            onClick={onResetPlan}
            className="shrink-0 text-xs font-semibold text-signal underline-offset-2 hover:underline"
          >
            Restore optimized
          </button>
        </div>
      )}

      <ol className="px-4 py-3">
        {/* Start */}
        <li className="flex gap-3">
          <div className="flex w-8 flex-col items-center">
            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-inkwell text-[10px] font-semibold tracking-wider text-paper">
              S
            </span>
            <span className="w-px flex-1 bg-rule" />
          </div>
          <div className="pt-1.5 pb-4">
            <div className="text-[0.66rem] font-semibold tracking-[0.16em] text-faint uppercase">
              Start · {clock12(dayStartClock)}
            </div>
            <div className="mt-0.5 text-sm font-medium text-ink">{startLabel}</div>
          </div>
        </li>

        {stops.map((s, i) => {
          const selected = s.accountId === selectedId;
          const warn = s.openingHoursState !== "open" && s.openingHoursState !== "unknown";
          const unknownHours = s.openingHoursState === "unknown";
          // In an adjusted plan the optimized leg only holds for legs whose
          // predecessor is unchanged; we keep it simple and honest: hide all.
          const legValid = !adjusted;
          return (
            <li key={s.accountId} className="flex gap-3">
              <div className="flex w-8 flex-col items-center">
                <span className="w-px flex-1 bg-rule" />
                <span
                  className={`my-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white transition-colors ${
                    selected ? "bg-inkwell" : s.isRevisit ? "bg-signal" : "bg-accent"
                  }`}
                >
                  {String(s.displaySeq).padStart(2, "0")}
                </span>
                {i < stops.length - 1 ? (
                  <span className="w-px flex-1 bg-rule" />
                ) : (
                  <span className="flex-1" />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1.5">
                {/* Travel leg from previous */}
                <div className="py-1.5 text-xs text-faint">
                  {legValid ? (
                    s.travelMinutesFromPrevious != null ? (
                      <>
                        {duration(s.travelMinutesFromPrevious)} · {km(s.travelDistanceKmFromPrevious)}
                        {s.durationIsGeodesicEstimate && (
                          <span
                            className="ml-1.5 text-signal"
                            title="Straight-line estimate — not verified drive time"
                          >
                            est.
                          </span>
                        )}
                      </>
                    ) : (
                      "Travel time unavailable"
                    )
                  ) : (
                    <span className="text-signal/80">Leg recalculates on rebuild</span>
                  )}
                </div>

                <div
                  ref={(el) => {
                    if (el) cardRefs.current.set(s.accountId, el);
                    else cardRefs.current.delete(s.accountId);
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(selected ? null : s.accountId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(selected ? null : s.accountId);
                    }
                  }}
                  onMouseEnter={() => onHover(s.accountId)}
                  onMouseLeave={() => onHover(null)}
                  className={`nv-fade-up w-full cursor-pointer rounded-lg border px-3.5 py-3 text-left transition-all ${
                    selected
                      ? "border-accent bg-accent-tint/50"
                      : s.accountId === hoveredId
                        ? "border-faint bg-canvas shadow-card"
                        : "border-rule bg-panel hover:border-faint hover:shadow-card"
                  }`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-ink">{s.businessName}</span>
                    <span className="shrink-0 text-xs font-medium text-muted">
                      {adjusted ? "—" : `${clock12(s.arrivalClock)}–${clock12(s.departureClock)}`}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">{s.categoryLabel}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone="accent">Fit {s.fitScore}</Badge>
                    <IntelligenceItineraryBadge intelligence={intelligenceByAccountId?.[s.accountId]} />
                    {s.isRevisit && <Badge tone="signal">Revisit</Badge>}
                    {warn && <Badge tone="signal">{s.openingHoursLabel}</Badge>}
                    {unknownHours && <Badge tone="outline">Hours unknown</Badge>}
                    {s.needsManualVerification && <Badge tone="outline">Verify</Badge>}
                  </div>

                  {selected && (
                    <div className="nv-fade-in mt-3 flex items-center gap-2 border-t border-rule-soft pt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewBrief(s.accountId);
                        }}
                        className="flex h-9 items-center rounded-md bg-accent px-3.5 text-xs font-semibold text-white hover:bg-accent-hover"
                      >
                        View brief
                      </button>
                      {s.googleMapsUrl && (
                        <a
                          href={s.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-9 items-center rounded-md border border-rule bg-panel px-3.5 text-xs font-medium text-ink hover:bg-canvas"
                        >
                          Open Maps
                        </a>
                      )}

                      <span className="ml-auto flex items-center gap-1">
                        <IconButton
                          label="Move earlier"
                          disabled={i === 0}
                          onClick={() => onMove(s.accountId, -1)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6" />
                          </svg>
                        </IconButton>
                        <IconButton
                          label="Move later"
                          disabled={i === stops.length - 1}
                          onClick={() => onMove(s.accountId, 1)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </IconButton>
                        <IconButton label="Remove from today" onClick={() => onRemove(s.accountId)} danger>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6 6 18" />
                          </svg>
                        </IconButton>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function IconButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-md border border-rule bg-panel disabled:opacity-35 ${
        danger ? "text-danger hover:bg-danger-tint" : "text-muted hover:bg-canvas hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "accent" | "signal" | "neutral" | "outline" | "danger";
  children: React.ReactNode;
}) {
  const cls =
    tone === "accent"
      ? "bg-accent-tint text-accent"
      : tone === "signal"
        ? "bg-signal-tint text-signal"
        : tone === "danger"
          ? "bg-danger-tint text-danger"
          : tone === "neutral"
            ? "bg-canvas text-ink"
            : "border border-rule text-muted";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.68rem] font-medium ${cls}`}>
      {children}
    </span>
  );
}
