"use client";

import type { ProspectSearchSuccess } from "@/lib/prospecting";
import { clockPlusMinutes, duration, km } from "@/lib/format";

export function SummaryStrip({
  data,
  manuallyAdjusted = false,
  displayStopCount,
}: {
  data: ProspectSearchSuccess;
  /** Rep reordered/removed stops — optimized totals no longer describe the displayed plan. */
  manuallyAdjusted?: boolean;
  /** Displayed stop count after any manual remove (defaults to the optimized count). */
  displayStopCount?: number;
}) {
  const summary = data.routeSummary;
  if (!summary) return null;

  const stops = data.result.entries;
  const shownStops = displayStopCount ?? summary.stopCount;
  const totalKm = stops.reduce((acc, s) => {
    const r = data.routeByAccountId[s.accountId];
    return acc + (r?.travelDistanceKmFromPrevious ?? 0);
  }, 0);
  const verifyCount = stops.filter((s) => s.needsManualVerification).length;
  const anyGeodesic = stops.some(
    (s) => data.routeByAccountId[s.accountId]?.durationIsGeodesicEstimate,
  );
  const finish =
    summary.estimatedDayMinutes != null
      ? clockPlusMinutes(summary.dayStartClock, summary.estimatedDayMinutes)
      : null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-rule bg-panel px-4 py-2.5 md:px-6">
      <Metric
        value={`${shownStops} / ${summary.target}`}
        label="visits"
      />
      {!manuallyAdjusted && summary.totalDriveMinutes != null && (
        <Metric value={duration(summary.totalDriveMinutes)} label="driving" />
      )}
      {!manuallyAdjusted && totalKm > 0 && <Metric value={km(totalKm)} label="" />}
      {!manuallyAdjusted && summary.estimatedDayMinutes != null && (
        <Metric value={duration(summary.estimatedDayMinutes)} label="planned" />
      )}
      {!manuallyAdjusted && finish && <Metric value={`Finish ${finish}`} label="" />}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {manuallyAdjusted && <Status tone="signal">Manually adjusted — rebuild to recalculate</Status>}
        {summary.trafficAware && !manuallyAdjusted && <Status>Traffic aware</Status>}
        <Status>{providerLabel(summary.routingProvider)} routing</Status>
        {!manuallyAdjusted && data.routeGeometry ? (
          <Status>Road route{data.routeGeometry.trafficAware ? " · traffic" : ""}</Status>
        ) : (
          stops.length > 0 && <Status tone="signal">Route line schematic</Status>
        )}
        {anyGeodesic && <Status tone="signal">Drive times estimated</Status>}
        {verifyCount > 0 && (
          <Status tone="signal">
            {verifyCount} stop{verifyCount === 1 ? "" : "s"} need verification
          </Status>
        )}
        {summary.driveTimeConstraintWarning && (
          <Status tone="signal">Drive limit not verified</Status>
        )}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <span className="text-[13px] whitespace-nowrap">
      <span className="font-semibold text-ink">{value}</span>
      {label ? <span className="ml-1 text-muted">{label}</span> : null}
    </span>
  );
}

function Status({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "signal";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.68rem] font-medium whitespace-nowrap ${
        tone === "signal" ? "bg-signal-tint text-signal" : "bg-canvas text-muted"
      }`}
    >
      <span
        className={`h-1 w-1 rounded-full ${tone === "signal" ? "bg-signal" : "bg-accent"}`}
      />
      {children}
    </span>
  );
}

export function providerLabel(provider: string): string {
  if (provider.includes("google")) return "Google";
  if (provider.includes("mock")) return "Mock";
  if (provider.includes("geodesic")) return "Geodesic";
  return provider;
}
