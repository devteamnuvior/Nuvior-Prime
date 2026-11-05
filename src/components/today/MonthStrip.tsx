"use client";

import Typography from "@mui/material/Typography";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import { MiniStatCard, StatStrip, StripEyebrow, useStatMotion } from "@/components/feedback/MiniStatCard";
import { METRIC_ICON, METRIC_SHORT, PERIOD_SHORT, TARGET_STATUS } from "@/components/performance/targetPresentation";
import type { RepDashboardDto } from "@/lib/repDashboard";
import { TARGET_METRIC_LABELS, TARGET_PERIOD_LABELS } from "@/domain/performance/targets";

/**
 * The rep's month at a glance, above the map on Today's Route: visits so far
 * this month, then every weekly and monthly target with its pace. Same cards
 * and motion as the admin live map.
 */
export function MonthStrip({ dashboard }: { dashboard: RepDashboardDto }) {
  const animate = useStatMotion();
  const { month } = dashboard;
  const targets = dashboard.progress.filter((p) => p.period === "WEEK" || p.period === "MONTH");
  const delta = month.visitsDelta;

  return (
    <StatStrip
      ariaLabel="This month"
      header={
        <>
          <StripEyebrow>This month</StripEyebrow>
          <CalendarMonthOutlined sx={{ fontSize: 16, color: "text.secondary" }} aria-hidden />
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {month.label}
          </Typography>
          <Typography variant="body2" noWrap sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
            · day {month.dayIndex}
          </Typography>
        </>
      }
    >
      <MiniStatCard
        index={0}
        label={`Visits in ${month.label}`}
        icon={StorefrontOutlined}
        tone={delta == null ? "neutral" : delta >= 0 ? "success" : "warning"}
        value={month.visits}
        chip={delta == null ? null : { label: `${delta >= 0 ? "+" : ""}${delta}%`, tone: delta >= 0 ? "success" : "warning" }}
        footer={delta == null ? `${month.activeDays} active day${month.activeDays === 1 ? "" : "s"}` : `vs last month to date · ${month.activeDays} active day${month.activeDays === 1 ? "" : "s"}`}
        footerTone={delta == null ? "neutral" : delta >= 0 ? "success" : "danger"}
        tooltip={`Visits logged in ${month.label} so far`}
        animate={animate}
      />
      {targets.map((p, i) => {
        const status = TARGET_STATUS[p.status];
        const note =
          p.status === "met"
            ? "target reached"
            : p.actual > 0 && p.dayIndex >= 3
              ? `${p.remaining} to go · pace ${p.forecast}`
              : `${p.remaining} to go`;
        return (
          <MiniStatCard
            key={`${p.period}-${p.metric}`}
            index={i + 1}
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
      })}
    </StatStrip>
  );
}
