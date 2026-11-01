import Box from "@mui/material/Box";
import Chip, { type ChipProps } from "@mui/material/Chip";

export type StatusTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONE: Record<StatusTone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: "background.sunken", fg: "text.primary", dot: "text.disabled" },
  primary: { bg: "action.selected", fg: "primary.main", dot: "primary.main" },
  success: { bg: "rgba(var(--nv-palette-success-mainChannel) / 0.12)", fg: "success.main", dot: "success.main" },
  warning: { bg: "rgba(var(--nv-palette-warning-mainChannel) / 0.14)", fg: "warning.main", dot: "warning.main" },
  danger: { bg: "rgba(var(--nv-palette-error-mainChannel) / 0.12)", fg: "error.main", dot: "error.main" },
  info: { bg: "rgba(var(--nv-palette-info-mainChannel) / 0.12)", fg: "info.main", dot: "info.main" },
};

/** Soft status chip with a leading dot — ACTIVE / DISABLED / VERIFY style states. */
export function StatusChip({
  tone = "neutral",
  dot = true,
  uppercase = false,
  sx,
  label,
  ...props
}: Omit<ChipProps, "color"> & { tone?: StatusTone; dot?: boolean; uppercase?: boolean }) {
  const t = TONE[tone];
  return (
    <Chip
      size="small"
      label={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          {dot && <Box component="span" aria-hidden sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: t.dot, flexShrink: 0 }} />}
          {label}
        </Box>
      }
      sx={[
        {
          bgcolor: t.bg,
          color: t.fg,
          borderRadius: 999,
          fontWeight: 600,
          ...(uppercase ? { textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.625rem" } : {}),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    />
  );
}

/** Square micro-label (segment numbers, provinces, codes). */
export function CodeChip({ label, inverse = false, sx, ...props }: ChipProps & { inverse?: boolean }) {
  return (
    <Chip
      size="small"
      variant={inverse ? "filled" : "outlined"}
      label={label}
      sx={[
        {
          fontFamily: "var(--mono)",
          fontSize: "0.65rem",
          letterSpacing: "0.08em",
          height: 20,
          borderRadius: 1,
          ...(inverse ? { bgcolor: "background.inverse", color: "background.default" } : { borderColor: "divider" }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    />
  );
}
