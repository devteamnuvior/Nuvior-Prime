import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { KpiGrid } from "@/components/feedback/KpiCard";
import { StatusChip, type StatusTone } from "@/components/feedback/StatusChip";
import {
  TARGET_METRIC_LABELS,
  TARGET_PERIOD_LABELS,
  type TargetProgress,
  type TargetStatus,
} from "@/domain/performance/targets";

const STATUS: Record<TargetStatus, { label: string; tone: StatusTone; bar: "success" | "primary" | "warning" }> = {
  met: { label: "Met", tone: "success", bar: "success" },
  ahead: { label: "Ahead", tone: "success", bar: "primary" },
  on_track: { label: "On track", tone: "primary", bar: "primary" },
  behind: { label: "Behind", tone: "warning", bar: "warning" },
};

const ORDER = { DAY: 0, WEEK: 1, MONTH: 2 } as const;

/** Server component: active targets for the signed-in rep with progress bars. */
export function TargetProgressStrip({ progress, day }: { progress: TargetProgress[]; day: string }) {
  if (!progress.length) return null;
  const sorted = [...progress].sort((a, b) => ORDER[a.period] - ORDER[b.period] || a.metric.localeCompare(b.metric));

  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="eyebrow" component="h2" sx={{ display: "block", mb: 2, color: "text.secondary" }}>
        Targets · {day}
      </Typography>
      <KpiGrid columns={Math.min(4, sorted.length)}>
        {sorted.map((p) => {
          const s = STATUS[p.status];
          return (
            <Card key={`${p.period}-${p.metric}`} sx={{ px: 5, py: 4, display: "grid", gap: 2 }}>
              <Typography variant="eyebrow">
                {TARGET_PERIOD_LABELS[p.period]} · {TARGET_METRIC_LABELS[p.metric]}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <Typography variant="h1" component="span" sx={{ fontVariantNumeric: "tabular-nums", color: p.status === "behind" ? "warning.main" : p.status === "met" ? "success.main" : "primary.main" }}>
                  {p.actual}
                </Typography>
                <Typography component="span" variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  / {p.target}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={p.percent}
                color={s.bar}
                aria-label={`${p.percent}% of target`}
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <StatusChip tone={s.tone} label={s.label} uppercase />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {p.status === "met"
                    ? "Target reached"
                    : p.period === "DAY" || p.dayIndex < 3
                      ? `${p.remaining} to go`
                      : `${p.remaining} to go · pace ${p.forecast}`}
                </Typography>
              </Box>
            </Card>
          );
        })}
      </KpiGrid>
    </Box>
  );
}
