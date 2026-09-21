"use client";

import { useState } from "react";
import type { ClinicIntelligenceDto, EvidenceItem } from "@/domain/intelligence/clinicIntelligenceDto";
import { Badge } from "@/components/today/Itinerary";

export function ClinicIntelligenceSection({
  intelligence,
  isPrivileged,
  isResearching,
  onResearch,
  onRefresh,
}: {
  intelligence: ClinicIntelligenceDto | null;
  isPrivileged: boolean;
  isResearching: boolean;
  onResearch: () => void;
  onRefresh?: () => void;
}) {
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  if (!intelligence) {
    return (
      <IntelSection title="Clinic Intelligence">
        <p className="text-muted">Research this clinic to see offerings, gaps, and the best NUVIOR opportunity.</p>
        <button
          type="button"
          onClick={onResearch}
          disabled={isResearching}
          className="mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-accent text-[13px] font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {isResearching ? "Researching…" : "Research clinic"}
        </button>
      </IntelSection>
    );
  }

  const state = isResearching ? "RESEARCHING" : intelligence.researchState;

  if (state === "NOT_RESEARCHED") {
    return (
      <IntelSection title="Clinic Intelligence">
        <p className="text-muted">Research this clinic to see offerings, gaps, and the best NUVIOR opportunity.</p>
        <button
          type="button"
          onClick={onResearch}
          disabled={isResearching}
          className="mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-accent text-[13px] font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          Research clinic
        </button>
      </IntelSection>
    );
  }

  if (state === "RESEARCHING") {
    return (
      <IntelSection title="Clinic Intelligence">
        <p className="text-muted">Researching clinic website and profile…</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
        </div>
      </IntelSection>
    );
  }

  if (state === "FAILED") {
    return (
      <IntelSection title="Clinic Intelligence">
        <p className="text-signal">{intelligence.failureMessage ?? "Research failed. Try again."}</p>
        <button
          type="button"
          onClick={onResearch}
          className="mt-3 flex h-10 w-full items-center justify-center rounded-lg border border-rule bg-panel text-[13px] font-medium text-ink hover:bg-canvas"
        >
          Retry research
        </button>
      </IntelSection>
    );
  }

  return (
    <IntelSection title="Clinic Intelligence">
      {state === "STALE" && (
        <p className="mb-3 text-xs text-signal">Source pages changed — refresh for updated intelligence.</p>
      )}

      {/* Account Fit — visually separate */}
      <div className="rounded-lg border border-rule-soft bg-canvas/60 px-3 py-2.5">
        <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-faint uppercase">
          Account fit
        </p>
        <p className="mt-0.5 text-[13px] text-ink">
          Should we visit this clinic?
          {intelligence.accountFitScore != null && (
            <span className="ml-2 font-semibold text-accent">Fit {intelligence.accountFitScore}</span>
          )}
        </p>
      </div>

      {/* Primary opportunity */}
      <div className="mt-3">
        <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-faint uppercase">
          Best NUVIOR opportunity
        </p>
        {intelligence.blockedDnc ? (
          <p className="mt-1.5 text-[13px] text-muted">
            {intelligence.noRecommendationMessage ??
              "Do-not-contact — no actionable sales recommendation."}
          </p>
        ) : intelligence.primary ? (
          <div className="mt-2 rounded-lg border border-accent/30 bg-accent-tint/40 px-3.5 py-3">
            <p className="text-[15px] font-semibold text-ink">{intelligence.primary.productName}</p>
            <p className="mt-0.5 text-xs font-medium text-accent">{intelligence.primary.headline}</p>
          </div>
        ) : (
          <p className="mt-1.5 text-[13px] text-muted">
            {intelligence.noRecommendationMessage ?? "No clear product opportunity yet"}
          </p>
        )}
      </div>

      {intelligence.primary?.whyReasons && intelligence.primary.whyReasons.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-faint uppercase">Why this fits</p>
          <ul className="mt-1.5 space-y-1">
            {intelligence.primary.whyReasons.map((r) => (
              <li key={r} className="flex gap-2 text-[13px]">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {intelligence.primary?.verifyQuestion && (
        <div className="mt-3 rounded-lg border border-signal/30 bg-signal-tint/30 px-3.5 py-3">
          <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-signal uppercase">
            Verify on visit
          </p>
          <p className="mt-1 text-[13px] font-medium text-ink">&ldquo;{intelligence.primary.verifyQuestion}&rdquo;</p>
        </div>
      )}

      {intelligence.primary?.gap && (
        <div className="mt-3">
          <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-faint uppercase">Opportunity gap</p>
          <p className="mt-1 text-[13px] font-medium text-ink">{intelligence.primary.gap.capabilityLabel}</p>
          <p className="text-xs text-muted">{intelligence.primary.gap.inventoryStateLabel}</p>
          <p className="mt-1.5 text-[13px] text-ink">
            <span className="font-medium">Why it matters: </span>
            {intelligence.primary.gap.whyItMatters}
          </p>
        </div>
      )}

      {intelligence.offerings.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-faint uppercase">
            What they appear to offer
          </p>
          <ul className="mt-1.5 space-y-1">
            {intelligence.offerings.slice(0, 12).map((o) => (
              <li key={`${o.category}-${o.label}`} className="flex items-baseline justify-between gap-2 text-[13px]">
                <span>{o.label}</span>
                <span className="shrink-0 text-[0.65rem] text-muted">{o.inventoryStateLabel}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {intelligence.secondaryOpportunities.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setSecondaryOpen((v) => !v)}
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
              className={`transition-transform ${secondaryOpen ? "rotate-90" : ""}`}
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
            View other opportunities ({intelligence.secondaryOpportunities.length})
          </button>
          {secondaryOpen && (
            <ul className="mt-2 space-y-2 border-l-2 border-rule-soft pl-3">
              {intelligence.secondaryOpportunities.map((s) => (
                <li key={s.productId} className="text-[13px]">
                  <span className="font-medium text-ink">{s.productName}</span>
                  <span className="ml-2 text-xs text-muted">{s.headline}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {intelligence.evidence.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setEvidenceOpen((v) => !v)}
            className="text-xs font-medium text-accent hover:text-accent-hover"
          >
            {evidenceOpen ? "Hide evidence" : "View evidence"}
          </button>
          {evidenceOpen && <EvidencePanel items={intelligence.evidence.slice(0, 20)} />}
        </div>
      )}

      {isPrivileged && intelligence.diagnostics && (
        <DiagnosticsPanel diagnostics={intelligence.diagnostics} />
      )}

      <div className="mt-3 flex gap-2">
        {(state === "STALE" || state === "NEEDS_VERIFICATION" || intelligence.canRefresh) && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isResearching}
            className="flex h-9 flex-1 items-center justify-center rounded-md border border-rule bg-panel text-xs font-medium text-ink hover:bg-canvas disabled:opacity-60"
          >
            Refresh research
          </button>
        )}
      </div>
    </IntelSection>
  );
}

/** Lightweight badge for itinerary cards. */
export function IntelligenceItineraryBadge({
  intelligence,
}: {
  intelligence: ClinicIntelligenceDto | null | undefined;
}) {
  if (!intelligence) {
    return <Badge tone="outline">Research clinic</Badge>;
  }
  if (intelligence.researchState === "NOT_RESEARCHED" || intelligence.researchState === "FAILED") {
    return <Badge tone="outline">Research clinic</Badge>;
  }
  if (intelligence.primary && !intelligence.blockedDnc) {
    return (
      <Badge tone="neutral">
        Best opportunity · {intelligence.primary.productName.split(" ").slice(0, 2).join(" ")}
      </Badge>
    );
  }
  if (intelligence.researchState === "RESEARCHING") {
    return <Badge tone="outline">Researching…</Badge>;
  }
  return null;
}

function IntelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 border-t border-rule-soft pt-4">
      <h3 className="mb-2 text-[0.66rem] font-semibold tracking-[0.16em] text-faint uppercase">
        {title}
      </h3>
      <div className="text-[13px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function EvidencePanel({ items }: { items: EvidenceItem[] }) {
  return (
    <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-rule bg-paper p-3">
      {items.map((e) => (
        <li key={e.id} className="border-b border-rule-soft pb-2 last:border-0 last:pb-0">
          {e.sourcePage && <p className="text-[0.65rem] font-medium text-muted">{e.sourcePage}</p>}
          {e.url && (
            <a
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="text-[0.65rem] text-accent hover:underline"
            >
              {e.url.length > 48 ? `${e.url.slice(0, 48)}…` : e.url}
            </a>
          )}
          {e.extractedItem && (
            <p className="mt-0.5 text-xs font-medium text-ink">{e.extractedItem}</p>
          )}
          <p className="mt-0.5 text-xs text-ink">{e.snippet}</p>
          <p className="mt-0.5 text-[0.6rem] text-faint">
            {e.confidence} confidence · {e.retrievedAt.slice(0, 10)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function DiagnosticsPanel({
  diagnostics,
}: {
  diagnostics: NonNullable<ClinicIntelligenceDto["diagnostics"]>;
}) {
  return (
    <details className="mt-3 rounded-lg border border-dashed border-faint bg-canvas/50 p-3">
      <summary className="cursor-pointer text-[0.65rem] font-semibold tracking-wide text-faint uppercase">
        Manager diagnostics
      </summary>
      <dl className="mt-2 space-y-1 text-[0.7rem] text-muted">
        <div className="flex justify-between gap-2">
          <dt>Score</dt>
          <dd className="font-mono text-ink">
            {diagnostics.opportunityScore} ({diagnostics.scoreBand})
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Confidence</dt>
          <dd>{diagnostics.confidence}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Profile</dt>
          <dd className="truncate font-mono">{diagnostics.profileVersion.slice(0, 12)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Gap rules</dt>
          <dd>{diagnostics.gapRulesVersion}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Scoring</dt>
          <dd>{diagnostics.scoringVersion}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Catalog</dt>
          <dd className="truncate font-mono">{diagnostics.catalogVersion.slice(0, 12)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Provider</dt>
          <dd>
            {diagnostics.researchProvider}
            {diagnostics.researchModel ? ` / ${diagnostics.researchModel}` : ""}
          </dd>
        </div>
      </dl>
    </details>
  );
}

export function intelligenceItineraryLabel(intelligence: ClinicIntelligenceDto | null | undefined): string | null {
  if (!intelligence || intelligence.researchState === "NOT_RESEARCHED") return "Research clinic";
  if (intelligence.primary && !intelligence.blockedDnc) {
    return `Best opportunity · ${intelligence.primary.productName.split(" ")[0]}`;
  }
  return null;
}
