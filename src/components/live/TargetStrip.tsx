"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import { MiniStatCard, StatStrip, StripEyebrow, useStatMotion } from "@/components/feedback/MiniStatCard";
import { METRIC_ICON, METRIC_SHORT, PERIOD_SHORT, TARGET_STATUS } from "@/components/performance/targetPresentation";
import { UserAvatar } from "@/components/admin/UserAvatar";
import type { LiveRepDto } from "@/domain/live/positions";
import { aggregateTeamTargets, TARGET_METRIC_LABELS, TARGET_PERIOD_LABELS, type TargetProgress, type TeamTargetStat } from "@/domain/performance";

type Scope = "team" | "rep";

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
  const animate = useStatMotion();

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
    <StatStrip
      ariaLabel={scope === "rep" && selected ? `Targets for ${selected.name}` : "Team targets"}
      header={
        <>
          <StripEyebrow>Targets</StripEyebrow>
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
        </>
      }
    >
      {stats.map((s, i) => (
        <TargetCard key={`${scope}:${selected?.id ?? "team"}:${s.key}`} index={i} stat={s} scope={scope} animate={animate} />
      ))}
    </StatStrip>
  );
}

function TargetCard({ index, stat, scope, animate }: { index: number; stat: TeamTargetStat; scope: Scope; animate: boolean }) {
  const p = stat.progress;
  const status = TARGET_STATUS[p.status];
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

  return (
    <MiniStatCard
      index={index}
      label={METRIC_SHORT[p.metric]}
      icon={METRIC_ICON[p.metric]}
      tone={status.tone}
      value={p.actual}
      target={p.target}
      ratio={p.ratio}
      chip={status}
      footer={`${PERIOD_SHORT[p.period]} · ${note}`}
      tooltip={`${TARGET_PERIOD_LABELS[p.period]} · ${TARGET_METRIC_LABELS[p.metric]}`}
      animate={animate}
      valueColor={p.status === "behind" ? "warning.main" : p.status === "met" ? "success.main" : undefined}
    />
  );
}
