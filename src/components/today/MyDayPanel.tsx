"use client";

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import LocalFireDepartmentOutlined from "@mui/icons-material/LocalFireDepartmentOutlined";
import type { RepDashboardDto } from "@/lib/repDashboard";
import { TARGET_METRIC_LABELS, type TargetProgress } from "@/domain/performance/targets";
import { BADGES, badgeDefinition } from "@/domain/performance/xp";
import { StatusChip } from "@/components/feedback/StatusChip";
import { BadgeIcon } from "@/components/performance/BadgeIcon";
import { LevelBar } from "@/components/performance/LevelBar";

const STORAGE_KEY = "nuvior.today.myday.collapsed";

const dayFmt = new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

function TargetBar({ p }: { p: TargetProgress }) {
  const color = p.status === "met" ? "success" : p.status === "behind" ? "warning" : "primary";
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2 }}>
        <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>
          {TARGET_METRIC_LABELS[p.metric]}
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, flexShrink: 0 }}>
          {p.actual}
          <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
            {" "}
            / {p.target}
          </Box>
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={p.percent} color={color} aria-label={`${TARGET_METRIC_LABELS[p.metric]}: ${p.percent}%`} sx={{ height: 6, borderRadius: 3 }} />
    </Box>
  );
}

/**
 * The rep's own day at a glance, shown at the top of the planner panel on
 * Today's Route: today's targets, what reaching them does, streak and XP.
 * The month's numbers live in the MonthStrip above the map.
 */
export function MyDayPanel({ data }: { data: RepDashboardDto }) {
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setOpen(false);
    } catch {
      /* private mode */
    }
  }, []);
  const toggle = () => {
    setOpen((o) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, o ? "1" : "0");
      } catch {
        /* ignore */
      }
      return !o;
    });
  };

  const daily = data.progress.filter((p) => p.period === "DAY");
  const dailyVisits = daily.find((p) => p.metric === "VISITS");

  return (
    <Box component="section" aria-label="My day" sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <ButtonBase onClick={toggle} aria-expanded={open} aria-controls="nv-myday" sx={{ width: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, px: 4, py: 2.5, textAlign: "left" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
          <Typography variant="eyebrow" component="h2" noWrap>
            My day · {dayFmt.format(new Date(`${data.today}T00:00:00.000Z`))}
          </Typography>
          {!open && dailyVisits && (
            <StatusChip dot={false} tone={dailyVisits.status === "met" ? "success" : dailyVisits.status === "behind" ? "warning" : "primary"} label={`${dailyVisits.actual} / ${dailyVisits.target} visits`} />
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {data.streak.days > 0 && (
            <Tooltip title={data.streak.atRisk ? "Hit today's target to keep the streak" : "Consecutive working days on target"}>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: data.streak.atRisk ? "warning.main" : "success.main", fontSize: "0.75rem", fontWeight: 600 }}>
                <LocalFireDepartmentOutlined sx={{ fontSize: 16 }} aria-hidden />
                {data.streak.days}
              </Box>
            </Tooltip>
          )}
          <ExpandMoreOutlined aria-hidden sx={{ fontSize: 18, color: "text.secondary", transition: (t) => t.transitions.create("transform"), transform: open ? "rotate(180deg)" : "none" }} />
        </Box>
      </ButtonBase>

      <Collapse in={open}>
        <Box id="nv-myday" sx={{ px: 4, pb: 4, display: "grid", gap: 4 }}>
          {daily.length > 0 && (
            <Box sx={{ display: "grid", gap: 2.5 }}>
              {daily.map((p) => (
                <TargetBar key={p.metric} p={p} />
              ))}
            </Box>
          )}

          {data.competition && (
            <Box sx={{ display: "grid", gap: 3, pt: 3, borderTop: 1, borderColor: "divider" }}>
              <LevelBar level={data.competition.xp.level} totalXp={data.competition.xp.totalXp} compact />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                {data.competition.rank ? (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                      #{data.competition.rank.rank} of {data.competition.rank.of}
                    </Box>{" "}
                    in {data.competition.rank.provinceCode} this week · {data.competition.rank.points} XP
                    {data.competition.rank.toFirst > 0 ? ` · ${data.competition.rank.toFirst} to first place` : data.competition.rank.of > 1 ? " · leading" : ""}
                  </Typography>
                ) : (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {data.competition.xp.weekPoints} XP this week
                  </Typography>
                )}
                <Typography component={Link} href="/leaderboard" variant="caption" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                  Leaderboard →
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                {data.competition.xp.badges.map((b) => {
                  const def = badgeDefinition(b.code);
                  return def ? <BadgeIcon key={b.code} badge={def} earned size={30} /> : null;
                })}
                {data.competition.xp.nextBadges.map((b) => (
                  <BadgeIcon key={b.code} badge={b} earned={false} size={30} hint={`(${b.value} / ${b.threshold})`} />
                ))}
                {data.competition.xp.badges.length === 0 && data.competition.xp.nextBadges.length === 0 && BADGES.length > 0 && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Badges unlock as you log visits.
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            {data.overdueFollowUps > 0 ? (
              <StatusChip tone="warning" label={`${data.overdueFollowUps} follow-up${data.overdueFollowUps === 1 ? "" : "s"} overdue`} />
            ) : data.dueTodayFollowUps > 0 ? (
              <StatusChip tone="primary" label={`${data.dueTodayFollowUps} follow-up${data.dueTodayFollowUps === 1 ? "" : "s"} due today`} />
            ) : (
              <span />
            )}
            <Typography component={Link} href="/visits" variant="caption" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
              Visit history →
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
