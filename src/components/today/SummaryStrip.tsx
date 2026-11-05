"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { StatusChip } from "@/components/feedback/StatusChip";
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
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 4,
        rowGap: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        px: { xs: 4, md: 6 },
        py: 1.5,
      }}
    >
      <Metric value={`${shownStops} / ${summary.target}`} label="Visits" />
      {!manuallyAdjusted && summary.totalDriveMinutes != null && (
        <Metric value={duration(summary.totalDriveMinutes)} label="Driving" />
      )}
      {!manuallyAdjusted && totalKm > 0 && <Metric value={km(totalKm)} label="" />}
      {!manuallyAdjusted && summary.estimatedDayMinutes != null && (
        <Metric value={duration(summary.estimatedDayMinutes)} label="Planned" />
      )}
      {!manuallyAdjusted && finish && <Metric value={`Finish ${finish}`} label="" />}

      <Box sx={{ ml: "auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        {manuallyAdjusted && <Status tone="signal">Manually Adjusted — Rebuild To Recalculate</Status>}
        {summary.trafficAware && !manuallyAdjusted && <Status>Traffic Aware</Status>}
        <Status>{providerLabel(summary.routingProvider)} routing</Status>
        {!manuallyAdjusted && data.routeGeometry ? (
          <Status>Road route{data.routeGeometry.trafficAware ? " · traffic" : ""}</Status>
        ) : (
          stops.length > 0 && <Status tone="signal">Route line schematic</Status>
        )}
        {anyGeodesic && <Status tone="signal">Drive Times Estimated</Status>}
        {verifyCount > 0 && (
          <Status tone="signal">
            {verifyCount} Stop{verifyCount === 1 ? "" : "s"} Need Verification
          </Status>
        )}
        {summary.driveTimeConstraintWarning && (
          <Status tone="signal">Drive Limit Not Verified</Status>
        )}
      </Box>
    </Box>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <Typography variant="caption" component="span" sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem" }}>
      <Box component="span" sx={{ fontWeight: 600 }}>
        {value}
      </Box>
      {label ? (
        <Box component="span" sx={{ ml: 1, color: "text.secondary" }}>
          {label}
        </Box>
      ) : null}
    </Typography>
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
    <StatusChip
      tone={tone === "signal" ? "warning" : "neutral"}
      label={children}
      sx={{ fontWeight: 500, height: 22, fontSize: "0.75rem" }}
    />
  );
}

export function providerLabel(provider: string): string {
  if (provider.includes("google")) return "Google";
  if (provider.includes("mock")) return "Mock";
  if (provider.includes("geodesic")) return "Geodesic";
  return provider;
}
