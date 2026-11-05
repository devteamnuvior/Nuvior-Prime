"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { RepDashboardDto } from "@/lib/repDashboard";
import { StatusChip } from "@/components/feedback/StatusChip";

const dayFmt = new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

/**
 * One line at the top of the planner panel on Today's Route: the date and how
 * many of today's clinics are done. The month's numbers live in the MonthStrip
 * above the map.
 */
export function MyDayPanel({ data }: { data: RepDashboardDto }) {
  const dailyVisits = data.progress.find((p) => p.period === "DAY" && p.metric === "VISITS");
  return (
    <Box component="section" aria-label="My day" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, px: 4, py: 2.5, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
      <Typography variant="eyebrow" component="h2" noWrap>
        My day · {dayFmt.format(new Date(`${data.today}T00:00:00.000Z`))}
      </Typography>
      {dailyVisits && (
        <StatusChip
          dot={false}
          tone={dailyVisits.status === "met" ? "success" : dailyVisits.status === "behind" ? "warning" : "primary"}
          label={`${dailyVisits.actual} / ${dailyVisits.target} visits`}
          sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
        />
      )}
    </Box>
  );
}
