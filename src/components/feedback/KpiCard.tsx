import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import type { SvgIconComponent } from "@mui/icons-material";
import TrendingDownOutlined from "@mui/icons-material/TrendingDownOutlined";
import TrendingFlatOutlined from "@mui/icons-material/TrendingFlatOutlined";
import TrendingUpOutlined from "@mui/icons-material/TrendingUpOutlined";

export type KpiTone = "neutral" | "primary" | "success" | "warning" | "danger";

const ICON_TONE: Record<KpiTone, { bg: string; fg: string }> = {
  neutral: { bg: "background.sunken", fg: "text.secondary" },
  primary: { bg: "action.selected", fg: "primary.main" },
  success: { bg: "rgba(var(--nv-palette-success-mainChannel) / 0.12)", fg: "success.main" },
  warning: { bg: "rgba(var(--nv-palette-warning-mainChannel) / 0.14)", fg: "warning.main" },
  danger: { bg: "rgba(var(--nv-palette-error-mainChannel) / 0.12)", fg: "error.main" },
};

/**
 * Stat tile: label, headline value, optional % change and icon.
 * `delta` is a signed percentage (12.5, -3); `deltaLabel` names the comparison window.
 */
export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  icon: Icon,
  tone = "neutral",
  loading = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  icon?: SvgIconComponent;
  tone?: KpiTone;
  loading?: boolean;
}) {
  const trend = delta == null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const TrendIcon = trend === "up" ? TrendingUpOutlined : trend === "down" ? TrendingDownOutlined : TrendingFlatOutlined;
  const trendColor = trend === "up" ? "success.main" : trend === "down" ? "error.main" : "text.secondary";
  const t = ICON_TONE[tone];

  return (
    <Card sx={{ px: 5, py: 4, display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3 }}>
        <Typography variant="eyebrow">{label}</Typography>
        {Icon ? (
          <Box aria-hidden sx={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1.5, bgcolor: t.bg, color: t.fg }}>
            <Icon sx={{ fontSize: 18 }} />
          </Box>
        ) : null}
      </Box>
      {loading ? (
        <Skeleton variant="rounded" width={80} height={32} />
      ) : (
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <Typography variant="h1" component="span" sx={{ fontVariantNumeric: "tabular-nums", color: tone === "primary" ? "primary.main" : tone === "danger" ? "error.main" : "text.primary" }}>
            {value}
          </Typography>
          {trend && (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: trendColor, fontSize: "0.75rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              <TrendIcon sx={{ fontSize: 14 }} aria-hidden />
              <Box component="span" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                {trend === "up" ? "Up" : trend === "down" ? "Down" : "Unchanged"}
              </Box>
              {Math.abs(delta!).toLocaleString("en-CA", { maximumFractionDigits: 1 })}%
            </Box>
          )}
        </Box>
      )}
      {(hint || deltaLabel) && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {hint ?? deltaLabel}
        </Typography>
      )}
    </Card>
  );
}

export function KpiGrid({ children, columns = 4 }: { children: React.ReactNode; columns?: number }) {
  return <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: `repeat(${columns}, minmax(0, 1fr))` } }}>{children}</Box>;
}
