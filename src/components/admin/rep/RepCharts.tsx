"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import type { FunnelStep, ProductMixSlice, WeekPoint } from "@/domain/performance/repMetrics";
import { LEAD_PRODUCT_LABELS } from "@/domain/terminology";
import { EmptyState } from "@/components/feedback/EmptyState";

function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, mb: 2 }}>
      {items.map((i) => (
        <Box key={i.label} sx={{ display: "inline-flex", alignItems: "center", gap: 1.5, fontSize: "0.75rem", color: "text.secondary" }}>
          <Box
            component="span"
            aria-hidden
            sx={{ width: 14, height: i.dashed ? 0 : 10, borderRadius: i.dashed ? 0 : 0.5, bgcolor: i.dashed ? "transparent" : i.color, borderTop: i.dashed ? `2px dashed ${i.color}` : "none" }}
          />
          {i.label}
        </Box>
      ))}
    </Box>
  );
}

/** Weekly visits against the weekly target. */
export function VisitsTrendChart({ weekly }: { weekly: WeekPoint[] }) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const quality = theme.palette.success.main;
  const muted = theme.palette.text.disabled;
  const hasData = weekly.some((w) => w.visits > 0);
  const hasTarget = weekly.some((w) => w.target != null);

  if (!hasData) {
    return <EmptyState compact illustration="table" title="No visits in this range" description="Weekly visits appear here once the rep logs visits." />;
  }

  return (
    <Box>
      <Legend
        items={[
          { color: primary, label: "Visits" },
          { color: quality, label: "Quality visits (fit ≥ 4)" },
          ...(hasTarget ? [{ color: muted, label: "Weekly target", dashed: true }] : []),
        ]}
      />
      <LineChart
        height={260}
        hideLegend
        grid={{ horizontal: true }}
        xAxis={[{ scaleType: "point", data: weekly.map((w) => w.label), tickLabelStyle: { fontSize: 11 } }]}
        yAxis={[{ min: 0, tickLabelStyle: { fontSize: 11 } }]}
        series={[
          { id: "visits", label: "Visits", data: weekly.map((w) => w.visits), color: primary, curve: "monotoneX", area: true, showMark: weekly.length <= 16 },
          { id: "quality", label: "Quality visits", data: weekly.map((w) => w.qualityVisits), color: quality, curve: "monotoneX", showMark: false },
          ...(hasTarget
            ? [{ id: "target", label: "Weekly target", data: weekly.map((w) => w.target ?? null), color: muted, curve: "linear" as const, showMark: false }]
            : []),
        ]}
        sx={{
          "& .MuiAreaElement-series-visits": { fillOpacity: 0.12 },
          "& .MuiLineElement-series-target": { strokeDasharray: "6 4" },
          "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: theme.palette.divider },
        }}
        margin={{ left: 8, right: 16, top: 8 }}
      />
    </Box>
  );
}

/** Funnel rendered as proportional bars — reads better than a true funnel for 5 steps. */
export function FunnelBars({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  if (!steps.some((s) => s.value > 0)) {
    return <EmptyState compact illustration="inbox" title="Nothing to show yet" description="Planned stops and logged visits build the funnel." />;
  }
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {steps.map((s, i) => {
        const prev = i === 0 ? null : steps[i - 1].value;
        const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <Box key={s.key}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
              <Typography variant="body2">{s.label}</Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {s.value}
                </Box>
                {conv != null && (
                  <Box component="span" sx={{ color: "text.secondary", ml: 1.5 }}>
                    {conv}%
                  </Box>
                )}
              </Typography>
            </Box>
            <Box sx={{ height: 8, borderRadius: 4, bgcolor: "background.sunken", overflow: "hidden" }}>
              <Box sx={{ width: `${Math.round((s.value / max) * 100)}%`, height: 1, borderRadius: 4, bgcolor: "primary.main", opacity: 1 - i * 0.12 }} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/** Share of planned stops by recommended lead product. */
export function ProductMixChart({ mix }: { mix: ProductMixSlice[] }) {
  const theme = useTheme();
  if (!mix.length) {
    return <EmptyState compact illustration="table" title="No planned stops in this range" description="Lead products come from the routes this rep built." />;
  }
  const labels = mix.map((m) => (LEAD_PRODUCT_LABELS as Record<string, string>)[m.product] ?? m.product);
  return (
    <BarChart
      height={Math.max(160, mix.length * 44 + 40)}
      layout="horizontal"
      hideLegend
      grid={{ vertical: true }}
      yAxis={[{ scaleType: "band", data: labels, tickLabelStyle: { fontSize: 11 }, width: 150 }]}
      xAxis={[{ min: 0, tickLabelStyle: { fontSize: 11 }, valueFormatter: (v: number) => `${v}%` }]}
      series={[{ id: "mix", data: mix.map((m) => m.percent), color: theme.palette.primary.main, valueFormatter: (v) => (v == null ? "" : `${v}% of planned stops`) }]}
      borderRadius={4}
      margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
      sx={{ "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: theme.palette.divider } }}
    />
  );
}
