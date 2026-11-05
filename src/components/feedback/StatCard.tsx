"use client";

import * as React from "react";
import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { SvgIconComponent } from "@mui/icons-material";

export type StatTone = "neutral" | "primary" | "success" | "warning";

export const STAT_TONE: Record<StatTone, { bg: string; fg: string; glow: string }> = {
  neutral: { bg: "background.sunken", fg: "text.secondary", glow: "rgba(var(--nv-palette-text-secondaryChannel) / 0.10)" },
  primary: { bg: "action.selected", fg: "primary.main", glow: "rgba(var(--nv-palette-primary-mainChannel) / 0.16)" },
  success: { bg: "rgba(var(--nv-palette-success-mainChannel) / 0.12)", fg: "success.main", glow: "rgba(var(--nv-palette-success-mainChannel) / 0.16)" },
  warning: { bg: "rgba(var(--nv-palette-warning-mainChannel) / 0.14)", fg: "warning.main", glow: "rgba(var(--nv-palette-warning-mainChannel) / 0.18)" },
};

export const statRise = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

const COUNT_MS = 900;
export const STAT_FILL_MS = 1100;
export const STAT_EASE = "cubic-bezier(0.2, 0.8, 0.3, 1)";

/** Eases a number from its previous value to `target` over `duration`; instant when `animate` is false. */
export function useCountUp(target: number, animate: boolean, duration = COUNT_MS) {
  const [value, setValue] = React.useState(animate ? 0 : target);
  const fromRef = React.useRef(animate ? 0 : target);
  React.useEffect(() => {
    if (!animate) {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (target - from) * eased);
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, animate, duration]);
  return value;
}

/** True once mounted on the client; drives the enter transitions so SSR renders the resting state. */
export function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

/**
 * Animated stat tile: eyebrow label, icon tile, a number that counts up on first paint, and an
 * optional aside (ring) and footer (bar, legend, note). Rises into place with a per-index delay.
 */
export function StatCard({
  index,
  label,
  value,
  icon: Icon,
  tone,
  animate,
  aside,
  footer,
  format = String,
}: {
  index: number;
  label: string;
  value: number;
  /** Renders the (animated) number; defaults to the plain integer. */
  format?: (n: number) => string;
  icon: SvgIconComponent;
  tone: StatTone;
  animate: boolean;
  aside?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = STAT_TONE[tone];
  const shown = useCountUp(value, animate);
  return (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
        px: 5,
        py: 4,
        display: "grid",
        gap: 3,
        alignContent: "start",
        animation: animate ? `${statRise} 560ms ${STAT_EASE} both` : "none",
        animationDelay: `${index * 90}ms`,
        transition: (th) => th.transitions.create(["transform", "box-shadow"], { duration: th.transitions.duration.short }),
        "&:hover": { transform: "translateY(-2px)", boxShadow: 2 },
        "&::before": {
          content: '""',
          position: "absolute",
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${t.glow}, transparent)`,
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3 }}>
        <Typography variant="eyebrow">{label}</Typography>
        <Box aria-hidden sx={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1.5, bgcolor: t.bg, color: t.fg }}>
          <Icon sx={{ fontSize: 18 }} />
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 3 }}>
        <Typography variant="h1" component="span" sx={{ fontSize: "2rem", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: tone === "primary" ? "primary.main" : "text.primary" }}>
          {format(shown)}
          {/* Keep the real value in the tree for screen readers while the count animates. */}
          <Box component="span" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            {format(value)}
          </Box>
        </Typography>
        {aside}
      </Box>
      {footer}
    </Card>
  );
}

/** Progress ring with the percentage in the middle; draws itself once mounted. */
export function StatRing({ ratio, tone, mounted, label }: { ratio: number; tone: StatTone; mounted: boolean; label: string }) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round(ratio * 100);
  return (
    <Tooltip title={label} arrow>
      <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }} aria-label={label} role="img">
        <Box component="svg" viewBox={`0 0 ${size} ${size}`} width={size} height={size} sx={{ display: "block", transform: "rotate(-90deg)" }}>
          <Box component="circle" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} sx={(t) => ({ stroke: (t.vars ?? t).palette.grey[200] })} />
          <Box
            component="circle"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={mounted ? c * (1 - Math.max(0, Math.min(1, ratio))) : c}
            sx={(t) => ({
              stroke: tone === "success" ? (t.vars ?? t).palette.success.main : tone === "warning" ? (t.vars ?? t).palette.warning.main : (t.vars ?? t).palette.primary.main,
              transition: `stroke-dashoffset ${STAT_FILL_MS}ms ${STAT_EASE}`,
            })}
          />
        </Box>
        <Typography component="span" sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.625rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "text.secondary" }}>
          {pct}%
        </Typography>
      </Box>
    </Tooltip>
  );
}

/** Thin progress bar that fills once mounted. */
export function StatBar({ ratio, tone, mounted }: { ratio: number; tone: StatTone; mounted: boolean }) {
  return (
    <Box aria-hidden sx={{ height: 6, borderRadius: 999, bgcolor: "grey.200", overflow: "hidden" }}>
      <Box sx={{ height: 1, width: mounted ? `${Math.max(0, Math.min(1, ratio)) * 100}%` : 0, borderRadius: 999, bgcolor: STAT_TONE[tone].fg, transition: `width ${STAT_FILL_MS}ms ${STAT_EASE}` }} />
    </Box>
  );
}

/** Stacked segments that grow in one after another, with a legend underneath. */
export function StatBreakdown({ parts, total, mounted }: { parts: { key: string; label: string; count: number; color: string }[]; total: number; mounted: boolean }) {
  const filled = parts.filter((p) => p.count > 0);
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box aria-hidden sx={{ display: "flex", height: 6, borderRadius: 999, bgcolor: "grey.200", overflow: "hidden", gap: "2px" }}>
        {filled.map((p, i) => (
          <Box key={p.key} sx={{ width: mounted ? `${(p.count / Math.max(1, total)) * 100}%` : 0, bgcolor: p.color, borderRadius: 999, transition: `width ${STAT_FILL_MS}ms ${STAT_EASE}`, transitionDelay: `${i * 80}ms` }} />
        ))}
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 3, rowGap: 1 }}>
        {parts.map((p) => (
          <Box key={p.key} component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1, color: "text.secondary", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>
            <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: p.color, opacity: p.count ? 1 : 0.35 }} />
            <Box component="span" sx={{ fontWeight: 600, color: p.count ? "text.primary" : "text.disabled" }}>
              {p.count}
            </Box>
            {p.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
