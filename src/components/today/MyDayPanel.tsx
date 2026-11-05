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
import { StatusChip, type StatusTone } from "@/components/feedback/StatusChip";
import { BadgeIcon } from "@/components/performance/BadgeIcon";
import { LevelBar } from "@/components/performance/LevelBar";

const STORAGE_KEY = "nuvior.today.myday.collapsed";

const TONE: Record<RepDashboardDto["message"]["tone"], { bg: string; fg: string; chip: StatusTone }> = {
  neutral: { bg: "background.sunken", fg: "text.primary", chip: "neutral" },
  primary: { bg: "action.selected", fg: "primary.main", chip: "primary" },
  success: { bg: "rgba(var(--nv-palette-success-mainChannel) / 0.12)", fg: "success.main", chip: "success" },
  warning: { bg: "rgba(var(--nv-palette-warning-mainChannel) / 0.14)", fg: "warning.main", chip: "warning" },
};

const dayFmt = new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const sparkFmt = new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

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

function Mini({ label, value, sub, subTone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; subTone?: "success" | "danger" | "neutral" }) {
  return (
    <Box sx={{ display: "grid", gap: 0.25, minWidth: 0 }}>
      <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="h3" component="span" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" noWrap sx={{ color: subTone === "success" ? "success.main" : subTone === "danger" ? "error.main" : "text.secondary" }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

/**
 * The rep's own day at a glance, shown at the top of the planner panel on
 * Today's Route: today's targets, what reaching them does, the month so far.
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
  const monthly = data.progress.filter((p) => p.period === "MONTH" || p.period === "WEEK");
  const tone = TONE[data.message.tone];
  const dailyVisits = daily.find((p) => p.metric === "VISITS");
  const sparkMax = Math.max(1, ...data.spark.map((s) => s.visits));

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
          <Box sx={{ borderRadius: 1.5, bgcolor: tone.bg, px: 3, py: 2.5, display: "grid", gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: tone.fg }}>
              {data.message.headline}
            </Typography>
            {data.message.detail && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {data.message.detail}
              </Typography>
            )}
          </Box>

          {daily.length > 0 && (
            <Box sx={{ display: "grid", gap: 2.5 }}>
              {daily.map((p) => (
                <TargetBar key={p.metric} p={p} />
              ))}
            </Box>
          )}

          <Box sx={{ display: "grid", gap: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Last 14 days
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {data.spark.reduce((a, s) => a + s.visits, 0)} visits
              </Typography>
            </Box>
            <Box role="img" aria-label={`Visits per day for the last 14 days: ${data.spark.map((s) => s.visits).join(", ")}`} sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 44 }}>
              {data.spark.map((s) => {
                const weekend = [0, 6].includes(new Date(`${s.day}T00:00:00.000Z`).getUTCDay());
                const h = s.visits === 0 ? 3 : Math.max(6, Math.round((s.visits / sparkMax) * 44));
                return (
                  <Tooltip key={s.day} title={`${sparkFmt.format(new Date(`${s.day}T00:00:00.000Z`))}: ${s.visits} visit${s.visits === 1 ? "" : "s"}`} placement="top" arrow>
                    <Box
                      sx={{
                        flex: 1,
                        height: h,
                        borderRadius: "3px 3px 0 0",
                        bgcolor: s.visits === 0 ? (weekend ? "transparent" : "background.sunken") : s.day === data.today ? "primary.main" : "rgba(var(--nv-palette-primary-mainChannel) / 0.55)",
                        border: s.visits === 0 && weekend ? 1 : 0,
                        borderColor: "divider",
                        transition: (t) => t.transitions.create("background-color"),
                        "&:hover": { bgcolor: "primary.main" },
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
          </Box>

          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", pt: 3, borderTop: 1, borderColor: "divider" }}>
            <Mini
              label={`Visits in ${data.month.label}`}
              value={data.month.visits}
              sub={data.month.visitsDelta == null ? `${data.month.activeDays} active days` : `${data.month.visitsDelta >= 0 ? "+" : ""}${data.month.visitsDelta}% vs last month to date`}
              subTone={data.month.visitsDelta == null ? "neutral" : data.month.visitsDelta >= 0 ? "success" : "danger"}
            />
            <Mini
              label="Average fit score"
              value={data.month.avgFitScore ?? "—"}
              sub={data.month.teamAvgFitScore != null ? `team ${data.month.teamAvgFitScore}` : undefined}
              subTone={data.month.teamAvgFitScore != null && data.month.avgFitScore != null ? (data.month.avgFitScore >= data.month.teamAvgFitScore ? "success" : "neutral") : "neutral"}
            />
            {monthly.map((p) => (
              <Mini
                key={`${p.period}-${p.metric}`}
                label={TARGET_METRIC_LABELS[p.metric]}
                value={
                  <>
                    {p.actual}
                    <Box component="span" sx={{ color: "text.secondary", fontWeight: 400, fontSize: "0.875rem" }}>
                      {" "}
                      / {p.target}
                    </Box>
                  </>
                }
                sub={p.status === "met" ? "Target met" : p.actual > 0 && p.dayIndex >= 3 ? `${p.remaining} to go · pace ${p.forecast}` : `${p.remaining} to go ${p.period === "WEEK" ? "this week" : "this month"}`}
                subTone={p.status === "met" || p.status === "ahead" ? "success" : p.status === "behind" ? "danger" : "neutral"}
              />
            ))}
          </Box>

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
