"use client";

import { useRef, useState } from "react";
import type { PlannedRouteStop } from "@/domain/routing/optimize";
import type { ProspectSearchSuccess } from "@/lib/prospecting";
import { CrmStatusPanel } from "@/components/CrmStatusPanel";
import { EvidenceInspector } from "@/components/EvidenceInspector";
import { VisitRecordForm } from "@/components/VisitRecordForm";
import { clock12 } from "@/lib/format";
import { Badge } from "./Itinerary";
import { ClinicIntelligenceSection } from "@/components/intelligence/ClinicIntelligenceSection";
import type { ClinicIntelligenceDto } from "@/domain/intelligence/clinicIntelligenceDto";

const SWIPE_CLOSE_PX = 90;

export function ClinicDrawer({
  stop,
  displaySeq,
  timesValid = true,
  data,
  intelligence,
  isPrivileged = false,
  isResearching = false,
  onResearch,
  onRefreshResearch,
  onClose,
  onViewBrief,
}: {
  stop: PlannedRouteStop;
  /** Sequence shown to the rep (reflects any manual reorder). */
  displaySeq?: number;
  /** False when the plan was manually adjusted — optimized times are stale. */
  timesValid?: boolean;
  data: ProspectSearchSuccess;
  intelligence?: ClinicIntelligenceDto | null;
  isPrivileged?: boolean;
  isResearching?: boolean;
  onResearch?: () => void;
  onRefreshResearch?: () => void;
  onClose: () => void;
  onViewBrief: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const crm = data.crmByAccountId[stop.accountId];
  const origins = data.fieldOriginsByAccountId[stop.accountId];

  const verified = (origins?.enrichedFields ?? []).slice(0, 3);
  const toVerify = (origins?.verifyFields ?? []).slice(0, 3);

  // Mobile bottom sheet: drag the handle down to dismiss.
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const el = sheetRef.current;
    if (el == null || dragStartY.current == null) return;
    const dy = Math.max(0, (e.touches[0]?.clientY ?? 0) - dragStartY.current);
    el.style.transform = `translateY(${dy}px)`;
    el.style.transition = "none";
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const el = sheetRef.current;
    if (el == null || dragStartY.current == null) return;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - dragStartY.current;
    dragStartY.current = null;
    el.style.transition = "transform 200ms ease";
    if (dy > SWIPE_CLOSE_PX) {
      el.style.transform = "translateY(105%)";
      setTimeout(onClose, 180);
    } else {
      el.style.transform = "";
    }
  };

  return (
    <div
      ref={sheetRef}
      className="nv-drawer-in fixed inset-x-0 bottom-0 z-[1100] flex max-h-[72dvh] flex-col rounded-t-2xl border-t border-rule bg-panel shadow-sheet md:absolute md:bottom-4 md:left-4 md:max-h-[calc(100%-2rem)] md:w-[370px] md:rounded-xl md:border md:shadow-float"
    >
      {/* Mobile grab handle — swipe down to close */}
      <div
        className="flex touch-none justify-center pt-2 pb-1 md:hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <span className="h-1 w-9 rounded-full bg-rule" />
      </div>

      <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-0 md:pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${
                stop.isRevisit ? "bg-signal" : "bg-accent"
              }`}
            >
              {displaySeq ?? stop.sequence}
            </span>
            <h2 className="truncate text-[15px] font-semibold text-ink">{stop.businessName}</h2>
          </div>
          <p className="mt-1 text-xs text-muted">
            {stop.categoryLabel} · Segment {stop.segmentNumber}.{stop.categoryNumber} ·{" "}
            {stop.organizationTypeLabel}
          </p>
          <p className="mt-0.5 text-xs text-faint">
            {stop.streetAddress}, {stop.city} {stop.postalCode}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="nv-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="accent">Fit {stop.fitScore}</Badge>
          <Badge tone="neutral">{stop.leadProductLabel}</Badge>
          {stop.isRevisit && <Badge tone="signal">Revisit</Badge>}
          {stop.needsManualVerification && <Badge tone="outline">Verify on site</Badge>}
        </div>

        <Section title="Why this stop">
          {stop.routeReasons.length > 0 ? (
            <ul className="space-y-1">
              {stop.routeReasons.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span>{sentence(r)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>{stop.openingAngle}</p>
          )}
        </Section>

        <Section title="Arrival & opening">
          {timesValid ? (
            <p>
              Planned {clock12(stop.arrivalClock)}–{clock12(stop.departureClock)} ·{" "}
              {stop.openingHoursLabel}
            </p>
          ) : (
            <p>
              <span className="text-signal">Times recalculate on rebuild</span> ·{" "}
              {stop.openingHoursLabel}
            </p>
          )}
          {stop.suggestedDropInWindow && (
            <p className="mt-1 text-muted">{stop.suggestedDropInWindow}</p>
          )}
        </Section>

        {(verified.length > 0 || toVerify.length > 0) && (
          <Section title="Signals">
            <ul className="space-y-1">
              {verified.map((f) => (
                <li key={f} className="flex items-baseline gap-2">
                  <span className="shrink-0 rounded bg-accent-tint px-1 py-px text-[0.6rem] font-semibold tracking-wide text-accent uppercase">
                    Verified
                  </span>
                  <span className="truncate">{humanizeField(f)}</span>
                </li>
              ))}
              {toVerify.map((f) => (
                <li key={f} className="flex items-baseline gap-2">
                  <span className="shrink-0 rounded bg-signal-tint px-1 py-px text-[0.6rem] font-semibold tracking-wide text-signal uppercase">
                    Verify
                  </span>
                  <span className="truncate">{humanizeField(f)}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="NUVIOR relationship">
          {crm?.applied ? (
            <ul className="space-y-1">
              <li>Status: {crm.internalStatus ?? "—"}</li>
              {crm.aptosCertificationLevel && (
                <li>
                  Aptos: {crm.aptosCertificationLevel}
                  {crm.aptosPathway && crm.aptosPathway !== "NONE" ? ` (${crm.aptosPathway})` : ""}
                </li>
              )}
              {crm.lastOrderStatus && <li>Ordering: {crm.lastOrderStatus.toLowerCase()}</li>}
              {crm.lastVisitDate && <li>Last visit: {crm.lastVisitDate.slice(0, 10)}</li>}
              {crm.nextRevisitDueDate && <li>Revisit due: {crm.nextRevisitDueDate.slice(0, 10)}</li>}
              {crm.crmStale && <li className="text-signal">Internal data may be stale</li>}
            </ul>
          ) : crm?.crmUnverified ? (
            <p className="text-signal">Internal record unverified — CRM source unavailable.</p>
          ) : (
            <p className="text-muted">No internal record matched. Treat as a new prospect.</p>
          )}
        </Section>

        <ClinicIntelligenceSection
          intelligence={intelligence ?? null}
          isPrivileged={isPrivileged}
          isResearching={isResearching}
          onResearch={onResearch ?? (() => {})}
          onRefresh={onRefreshResearch}
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onViewBrief}
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-accent text-[13px] font-semibold text-white hover:bg-accent-hover"
          >
            View pre-visit brief
          </button>
          {stop.googleMapsUrl && (
            <a
              href={stop.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center rounded-lg border border-rule bg-panel px-4 text-[13px] font-medium text-ink hover:bg-canvas"
            >
              Open in Google Maps
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={`transition-transform ${detailsOpen ? "rotate-90" : ""}`}
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
          Details — evidence, CRM &amp; visit log
        </button>

        {detailsOpen && (
          <div className="mt-3 space-y-3">
            <CrmStatusPanel accountName={stop.businessName} overlay={crm} />
            <VisitRecordForm
              placeId={stop.accountId}
              crmExternalId={crm?.crmExternalId ?? null}
              businessName={stop.businessName}
            />
            {origins && (
              <EvidenceInspector
                accountName={stop.businessName}
                evidence={origins.evidence ?? []}
                enrichment={data.enrichmentByAccountId[stop.accountId]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1.5 text-[0.66rem] font-semibold tracking-[0.16em] text-faint uppercase">
        {title}
      </h3>
      <div className="text-[13px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function sentence(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "skincareLines=Vichy, La Roche" → "Skincare lines: Vichy, La Roche" */
function humanizeField(f: string): string {
  const [path, ...rest] = f.split("=");
  const label = path
    .replace(/([A-Z])/g, " $1")
    .replace(/[._]/g, " ")
    .toLowerCase()
    .trim();
  const value = rest.join("=");
  return value ? `${sentence(label)}: ${value}` : sentence(label);
}
