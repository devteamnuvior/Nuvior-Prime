"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import DirectionsCarOutlined from "@mui/icons-material/DirectionsCarOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import StarOutlineRounded from "@mui/icons-material/StarOutlineRounded";
import EventRepeatOutlined from "@mui/icons-material/EventRepeatOutlined";
import { StatBar, StatBreakdown, StatCard, StatRing, useMounted } from "@/components/feedback/StatCard";
import { duration } from "@/lib/format";
import { OUTCOME_BUCKETS, outcomeBucket, type LoggedVisitRow, type PlannedRouteRow } from "./visitPresentation";

/** The four animated tiles at the top of Visit History. */
export function VisitStats({ runs, visits }: { runs: PlannedRouteRow[]; visits: LoggedVisitRow[] }) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mounted = useMounted() || reduceMotion;
  const animate = !reduceMotion;

  const scored = visits.filter((v) => typeof v.fitScore === "number");
  const avgFit = scored.length ? Math.round((scored.reduce((a, v) => a + (v.fitScore ?? 0), 0) / scored.length) * 10) / 10 : null;
  const followUps = visits.filter((v) => !!v.nextAction?.trim()).length;
  const stops = runs.reduce((a, r) => a + r.stopCount, 0);
  const drive = runs.reduce((a, r) => a + (r.totalDriveMinutes ?? 0), 0);
  const buckets = OUTCOME_BUCKETS.map((b) => ({ key: b.key, label: b.label, color: b.color, count: visits.filter((v) => outcomeBucket(v.outcomeCode) === b.key).length }));
  const withOutcome = buckets.reduce((a, b) => a + b.count, 0);
  const fitRatio = avgFit != null ? avgFit / 5 : 0;
  const followRatio = visits.length ? followUps / visits.length : 0;

  return (
    <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
      <StatCard
        index={0}
        label="Logged visits"
        value={visits.length}
        icon={FactCheckOutlined}
        tone="success"
        animate={animate}
        footer={
          visits.length ? (
            <StatBreakdown parts={buckets} total={withOutcome || 1} mounted={mounted} />
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Nothing logged yet
            </Typography>
          )
        }
      />
      <StatCard
        index={1}
        label="Average fit"
        value={avgFit != null ? Math.round(avgFit * 10) : 0}
        format={(n) => (avgFit == null ? "—" : (n / 10).toFixed(1))}
        icon={StarOutlineRounded}
        tone="primary"
        animate={animate}
        aside={<StatRing ratio={fitRatio} tone="primary" mounted={mounted} label={avgFit != null ? `Average fit ${avgFit} of 5 across ${scored.length} visits` : "No fit scores yet"} />}
        footer={
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {avgFit != null ? `Out of 5 · ${scored.length} of ${visits.length} visits scored` : "Fit of the clinics you visit"}
          </Typography>
        }
      />
      <StatCard
        index={2}
        label="Planned routes"
        value={runs.length}
        icon={RouteOutlined}
        tone="neutral"
        animate={animate}
        footer={
          <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
            <DirectionsCarOutlined sx={{ fontSize: 16 }} aria-hidden />
            {runs.length ? `${stops} stops · ${drive ? duration(drive) : "—"} driving` : "No routes built yet"}
          </Typography>
        }
      />
      <StatCard
        index={3}
        label="Follow-ups noted"
        value={followUps}
        icon={EventRepeatOutlined}
        tone={followUps ? "warning" : "neutral"}
        animate={animate}
        footer={
          <Box sx={{ display: "grid", gap: 2 }}>
            <StatBar ratio={followRatio} tone={followUps ? "warning" : "neutral"} mounted={mounted} />
            <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
              {visits.length ? `${Math.round(followRatio * 100)}% of visits have a next action` : "Next actions you write down"}
            </Typography>
          </Box>
        }
      />
    </Box>
  );
}
