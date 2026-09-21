"use client";

import { useState } from "react";
import type { ProspectSearchSuccess } from "@/lib/prospecting";
import { MatchingQueuePanel } from "@/components/MatchingQueuePanel";
import { VerificationQueuePanel } from "@/components/VerificationQueuePanel";

/**
 * Collapsed run diagnostics — pipeline stats, exclusions, and the manager
 * queues (matching / verification). Kept out of the rep's primary flow.
 */
export function Diagnostics({ data }: { data: ProspectSearchSuccess }) {
  const [open, setOpen] = useState(false);
  const summary = data.routeSummary;
  const excluded = summary?.excludedForRouting ?? [];
  const attention =
    data.matchingQueue.length +
    data.verificationQueue.length +
    excluded.length +
    data.result.excludedDoNotContact.length;

  return (
    <div className="border-t border-rule">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-medium text-muted hover:bg-canvas hover:text-ink"
      >
        <span className="flex items-center gap-1.5">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={`transition-transform ${open ? "rotate-90" : ""}`}
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
          Run diagnostics
        </span>
        {attention > 0 && <span className="text-faint">{attention} items</span>}
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-rule bg-panel p-4 text-xs">
            <Stat label="Discovered" value={String(data.discovery.discoveredCount)} />
            <Stat label="Qualified" value={String(data.qualifiedCount)} />
            <Stat label="Places" value={data.placesProvider} />
            <Stat label="CRM" value={data.crmProvider + (data.crmUnavailable ? " (unavailable)" : "")} />
            <Stat label="Routing" value={data.routingProvider} />
            <Stat
              label="AI briefs"
              value={
                data.llm.enabled
                  ? `${data.llm.briefsSynthesized} synthesized / ${data.llm.briefsFallback} fallback`
                  : "template"
              }
            />
            <Stat
              label="Road geometry"
              value={
                data.routeGeometry
                  ? `${data.routeGeometry.provider} · ${data.routeGeometry.encodedSegments.length} segment(s)${data.routeGeometry.fromCache ? " · cached" : ""}`
                  : "unavailable — schematic line shown"
              }
            />
            {data.workingAreaApplied && (
              <Stat
                label="Working area"
                value={`${data.workingAreaApplied.points} points · ${data.workingAreaApplied.excludedOutsideArea} candidates outside excluded`}
              />
            )}
          </dl>

          {summary && summary.warnings.length > 0 && (
            <Block title="Routing warnings">
              <ul className="list-disc space-y-1 pl-4">
                {summary.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Block>
          )}

          {excluded.length > 0 && (
            <Block title={`Not routed (${excluded.length})`}>
              <ul className="space-y-1">
                {excluded.map((e) => (
                  <li key={e.accountId} className="flex justify-between gap-3">
                    <span className="truncate">{e.businessName}</span>
                    <span className="shrink-0 text-faint">{e.reason}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {data.result.excludedDoNotContact.length > 0 && (
            <Block title="Excluded — do not contact">
              <ul className="space-y-1">
                {data.result.excludedDoNotContact.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Block>
          )}

          {data.result.unverifiedAccounts.length > 0 && (
            <Block title="Verify manually">
              <ul className="space-y-1">
                {data.result.unverifiedAccounts.map((a) => (
                  <li key={a.accountId}>{a.businessName}</li>
                ))}
              </ul>
            </Block>
          )}

          <MatchingQueuePanel items={data.matchingQueue} />
          <VerificationQueuePanel items={data.verificationQueue} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.62rem] font-semibold tracking-[0.14em] text-faint uppercase">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-rule bg-panel p-4 text-xs text-ink">
      <h4 className="mb-2 text-[0.62rem] font-semibold tracking-[0.14em] text-faint uppercase">
        {title}
      </h4>
      {children}
    </div>
  );
}
