"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { SvgIconComponent } from "@mui/icons-material";
import EventRepeatOutlined from "@mui/icons-material/EventRepeatOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import PersonAddAlt1Outlined from "@mui/icons-material/PersonAddAlt1Outlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import { STAT_EASE, STAT_FILL_MS, STAT_TONE, statRise, useCountUp, useMounted, type StatTone } from "@/components/feedback/StatCard";
import { StatusChip } from "@/components/feedback/StatusChip";
import { UserAvatar } from "@/components/admin/UserAvatar";
import type { LiveRepDto } from "@/domain/live/positions";
import {
  aggregateTeamTargets,
  TARGET_METRIC_LABELS,
  TARGET_PERIOD_LABELS,
  type TargetMetric,
  type TargetPeriod,
  type TargetProgress,
  type TargetStatus,
  type TeamTargetStat,
} from "@/domain/performance";

const METRIC_ICON: Record<TargetMetric, SvgIconComponent> = {
  VISITS: StorefrontOutlined,
  NEW_ACCOUNTS: PersonAddAlt1Outlined,
  FOLLOW_UPS: EventRepeatOutlined,
  ACADEMY_SIGNUPS: SchoolOutlined,
  ORDERS: ShoppingBagOutlined,
};

/** Short card labels; the full catalogue names stay in the tooltip. */
const METRIC_SHORT: Record<TargetMetric, string> = {
  VISITS: "Clinics",
  NEW_ACCOUNTS: "New accounts",
  FOLLOW_UPS: "Follow-ups",
  ACADEMY_SIGNUPS: "Academy sign-ups",
  ORDERS: "Orders",
};

const PERIOD_SHORT: Record<TargetPeriod, string> = { DAY: "Today", WEEK: "This week", MONTH: "This month" };

const STATUS: Record<TargetStatus, { label: string; tone: StatTone }> = {
  met: { label: "Met", tone: "success" },
  ahead: { label: "Ahead", tone: "success" },
  on_track: { label: "On track", tone: "primary" },
  behind: { label: "Behind", tone: "warning" },
};

const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Target cards above the live map. Team totals by default (every rep on the
 * map, summed per target); the selected rep's own targets while one is focused.
 * Cards rise in one after another, the numbers count up and the bars fill; a
 * poll that changes a number tweens it rather than jumping.
 */
export function TargetStrip({
  reps,
  targets,
  day,
  selectedId,
  onShowTeam,
}: {
  reps: LiveRepDto[];
  targets: Record<string, TargetProgress[]>;
  day: string;
  selectedId: string | null;
  onShowTeam: () => void;
}) {
  const reduceMotion = useMediaQuery(REDUCED);
  const animate = !reduceMotion;

  const selected = selectedId ? (reps.find((r) => r.id === selectedId) ?? null) : null;
  const scope: Scope = selected && targets[selected.id] ? "rep" : "team";
  const stats = React.useMemo(() => {
    if (scope === "rep" && selected) return aggregateTeamTargets({ [selected.id]: targets[selected.id] ?? [] }, day);
    const onMap: Record<string, TargetProgress[]> = {};
    for (const r of reps) if (targets[r.id]) onMap[r.id] = targets[r.id];
    return aggregateTeamTargets(onMap, day);
  }, [scope, selected, reps, targets, day]);

  if (stats.length === 0) return null;
  const repCount = scope === "rep" ? 1 : Object.keys(targets).filter((id) => reps.some((r) => r.id === id)).length;

  return (
    <Box
      component="section"
      aria-label={scope === "rep" && selected ? `Targets for ${selected.name}` : "Team targets"}
      sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default", px: { xs: 4, md: 6 }, pt: 3, pb: 3.5, display: "grid", gap: 2.5 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0, minHeight: 24 }}>
        <Typography variant="eyebrow">Targets</Typography>
        <Box aria-hidden sx={{ width: 3, height: 3, borderRadius: "50%", bgcolor: "text.disabled", flexShrink: 0 }} />
        {scope === "rep" && selected ? (
          <Box key="rep" className="nv-fade-in" sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
            <UserAvatar name={selected.name} email={selected.email} size="sm" />
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {selected.name}
            </Typography>
            <ButtonBase
              onClick={onShowTeam}
              sx={{
                ml: 1,
                px: 2,
                height: 24,
                borderRadius: 999,
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "text.secondary",
                bgcolor: "background.sunken",
                transition: (t) => t.transitions.create(["background-color", "color"], { duration: t.transitions.duration.short }),
                "&:hover": { bgcolor: "action.selected", color: "primary.main" },
                "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
              }}
            >
              Show team
            </ButtonBase>
          </Box>
        ) : (
          <Box key="team" className="nv-fade-in" sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, color: "text.primary" }}>
            <GroupsOutlined sx={{ fontSize: 16, color: "text.secondary" }} aria-hidden />
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              Team
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
              · {repCount} rep{repCount === 1 ? "" : "s"} on the map
            </Typography>
          </Box>
        )}
      </Box>

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
        {stats.map((s, i) => (
          <TargetCard key={`${scope}:${selected?.id ?? "team"}:${s.key}`} index={i} stat={s} scope={scope} animate={animate} />
        ))}
      </Box>
    </Box>
  );
}

type Scope = "team" | "rep";

function TargetCard({ index, stat, scope, animate }: { index: number; stat: TeamTargetStat; scope: Scope; animate: boolean }) {
  const p = stat.progress;
  const status = STATUS[p.status];
  const t = STAT_TONE[status.tone];
  const Icon = METRIC_ICON[p.metric];
  // Each card owns its mount flag: re-keying on a scope change replays the fill.
  const mounted = useMounted() || !animate;
  const shown = useCountUp(p.actual, animate, 800);
  const ratio = Math.max(0, Math.min(1, p.ratio));
  const title = `${TARGET_PERIOD_LABELS[p.period]} · ${TARGET_METRIC_LABELS[p.metric]}`;

  const note =
    p.status === "met"
      ? scope === "team" && stat.reps > 1
        ? "everyone reached it"
        : "target reached"
      : scope === "team" && stat.reps > 1
        ? `${stat.repsOnPace}/${stat.reps} on pace`
        : p.period === "DAY" || p.dayIndex < 3
          ? `${p.remaining} to go`
          : `${p.remaining} to go · pace ${p.forecast}`;
  const footer = `${PERIOD_SHORT[p.period]} · ${note}`;

  return (
    <Tooltip title={title} enterDelay={600} arrow>
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
            {METRIC_SHORT[p.metric]}
          </Typography>
          <Box aria-hidden sx={{ width: 26, height: 26, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1.5, bgcolor: t.bg, color: t.fg }}>
            <Icon sx={{ fontSize: 15 }} />
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
          <Typography
            component="span"
            sx={{ fontSize: "1.375rem", lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: p.status === "behind" ? "warning.main" : p.status === "met" ? "success.main" : "text.primary" }}
          >
            {shown}
            <Box component="span" sx={{ ml: 1, fontSize: "0.8125rem", fontWeight: 500, letterSpacing: 0, color: "text.secondary" }}>
              / {p.target}
            </Box>
            {/* Keep the real value in the tree for screen readers while the count animates. */}
            <Box component="span" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              {p.actual} of {p.target}
            </Box>
          </Typography>
          <StatusChip tone={status.tone} label={status.label} uppercase sx={{ height: 18, "& .MuiChip-label": { px: 1.5 } }} />
        </Box>

        <Box aria-hidden sx={{ height: 5, borderRadius: 999, bgcolor: "grey.200", overflow: "hidden" }}>
          <Box sx={{ height: 1, width: mounted ? `${ratio * 100}%` : 0, borderRadius: 999, bgcolor: t.fg, transition: `width ${STAT_FILL_MS}ms ${STAT_EASE}`, transitionDelay: animate ? `${index * 80 + 120}ms` : "0ms" }} />
        </Box>

        <Typography variant="caption" noWrap sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {footer}
        </Typography>
      </Card>
    </Tooltip>
  );
}
