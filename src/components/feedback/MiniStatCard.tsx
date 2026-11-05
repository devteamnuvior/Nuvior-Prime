"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { SvgIconComponent } from "@mui/icons-material";
import { STAT_EASE, STAT_FILL_MS, STAT_TONE, statRise, useCountUp, useMounted, type StatTone } from "./StatCard";
import { StatusChip } from "./StatusChip";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** True unless the viewer asked for reduced motion — drives the strip's rise, count-up and fill. */
export function useStatMotion(): boolean {
  return !useMediaQuery(REDUCED_MOTION_QUERY);
}

/**
 * A compact stat card for a horizontal strip above a map: eyebrow label, icon tile, a number that
 * counts up (and tweens on later changes), an optional "/ target", bar and status chip, and a
 * one-line footer. Rises into place with a per-index delay; re-key it to replay.
 */
export function MiniStatCard({
  index,
  label,
  icon: Icon,
  tone,
  value,
  target = null,
  ratio = null,
  chip = null,
  footer,
  footerTone = "neutral",
  tooltip,
  animate,
  valueColor,
}: {
  index: number;
  label: string;
  icon: SvgIconComponent;
  tone: StatTone;
  value: number;
  target?: number | null;
  /** 0–1 fills the bar; null hides it. */
  ratio?: number | null;
  chip?: { label: string; tone: StatTone } | null;
  footer: string;
  footerTone?: "neutral" | "success" | "danger";
  tooltip?: string;
  animate: boolean;
  /** Theme colour for the headline number (defaults to text.primary). */
  valueColor?: string;
}) {
  const t = STAT_TONE[tone];
  // Each card owns its mount flag: re-keying replays the fill.
  const mounted = useMounted() || !animate;
  const shown = useCountUp(value, animate, 800);
  const fill = ratio == null ? null : Math.max(0, Math.min(1, ratio));

  const card = (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
        px: 3.5,
        py: 3,
        display: "grid",
        gap: 2,
        alignContent: "start",
        minWidth: 0,
        animation: animate ? `${statRise} 520ms ${STAT_EASE} both` : "none",
        animationDelay: `${index * 80}ms`,
        transition: (th) => th.transitions.create(["transform", "box-shadow"], { duration: th.transitions.duration.short }),
        "&:hover": { transform: "translateY(-2px)", boxShadow: 2 },
        "&::before": {
          content: '""',
          position: "absolute",
          top: -36,
          right: -36,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, ${t.glow}, transparent)`,
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, minWidth: 0 }}>
        <Typography variant="eyebrow" noWrap sx={{ minWidth: 0, fontSize: "0.625rem", letterSpacing: "0.1em" }}>
          {label}
        </Typography>
        <Box aria-hidden sx={{ width: 26, height: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1.5, bgcolor: t.bg, color: t.fg }}>
          <Icon sx={{ fontSize: 15 }} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
        <Typography component="span" sx={{ fontSize: "1.375rem", lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: valueColor ?? "text.primary" }}>
          {shown}
          {target != null && (
            <Box component="span" sx={{ ml: 1, fontSize: "0.8125rem", fontWeight: 500, letterSpacing: 0, color: "text.secondary" }}>
              / {target}
            </Box>
          )}
          {/* Keep the real value in the tree for screen readers while the count animates. */}
          <Box component="span" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            {target != null ? `${value} of ${target}` : value}
          </Box>
        </Typography>
        {chip && <StatusChip tone={chip.tone} label={chip.label} uppercase sx={{ height: 18, "& .MuiChip-label": { px: 1.5 } }} />}
      </Box>

      {fill != null && (
        <Box aria-hidden sx={{ height: 5, borderRadius: 999, bgcolor: "grey.200", overflow: "hidden" }}>
          <Box sx={{ height: 1, width: mounted ? `${fill * 100}%` : 0, borderRadius: 999, bgcolor: t.fg, transition: `width ${STAT_FILL_MS}ms ${STAT_EASE}`, transitionDelay: animate ? `${index * 80 + 120}ms` : "0ms" }} />
        </Box>
      )}

      <Typography variant="caption" noWrap sx={{ color: footerTone === "success" ? "success.main" : footerTone === "danger" ? "error.main" : "text.secondary", fontVariantNumeric: "tabular-nums" }}>
        {footer}
      </Typography>
    </Card>
  );

  return tooltip ? (
    <Tooltip title={tooltip} enterDelay={600} arrow>
      {card}
    </Tooltip>
  ) : (
    card
  );
}

/** The strip itself: a header row and a horizontally scrolling row of equal cards. */
export function StatStrip({ ariaLabel, header, children }: { ariaLabel: string; header: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box
      component="section"
      aria-label={ariaLabel}
      sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default", px: { xs: 4, md: 6 }, pt: 3, pb: 3.5, display: "grid", gap: 2.5 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0, minHeight: 24 }}>{header}</Box>
      <Box
        className="nv-scroll"
        sx={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: { xs: "minmax(184px, 1fr)", md: "minmax(168px, 1fr)" },
          gap: 3,
          overflowX: "auto",
          overscrollBehaviorX: "contain",
          // Room for the rise animation and the hover lift without clipping.
          mx: -1,
          px: 1,
          pt: 0.5,
          pb: 1,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Eyebrow + dot separator used at the start of a strip header. */
export function StripEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Typography variant="eyebrow">{children}</Typography>
      <Box aria-hidden sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "text.disabled", flexShrink: 0 }} />
    </>
  );
}
