"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { CalendarCell } from "@/domain/performance/repMetrics";
import { parseDayKey, addDays } from "@/domain/performance/targets";

const DOW = ["Mon", "", "Wed", "", "Fri", "", ""];
const fmt = new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("en-CA", { month: "short", timeZone: "UTC" });

/** GitHub-style activity grid: one column per week, one row per weekday (Monday first). */
export function ActivityCalendar({ cells }: { cells: CalendarCell[] }) {
  if (!cells.length) return null;
  const max = Math.max(1, ...cells.map((c) => c.visits));

  // Pad the first week so Monday sits in row 0.
  const first = parseDayKey(cells[0].day);
  const dow = first.getUTCDay(); // 0 = Sunday
  const pad = dow === 0 ? 6 : dow - 1;
  const padded: (CalendarCell | null)[] = [...Array<null>(pad).fill(null), ...cells];
  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  // Month labels where the month changes at the top of a column.
  const monthLabels = weeks.map((w, i) => {
    const firstCell = w.find(Boolean);
    if (!firstCell) return "";
    const d = parseDayKey(firstCell.day);
    const prev = i > 0 ? weeks[i - 1].find(Boolean) : null;
    if (!prev) return monthFmt.format(d);
    return parseDayKey(prev.day).getUTCMonth() !== d.getUTCMonth() ? monthFmt.format(d) : "";
  });

  const level = (v: number) => (v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const colors = ["background.sunken", "rgba(var(--nv-palette-primary-mainChannel) / 0.25)", "rgba(var(--nv-palette-primary-mainChannel) / 0.45)", "rgba(var(--nv-palette-primary-mainChannel) / 0.7)", "primary.main"];

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: `28px repeat(${weeks.length}, 14px)`, gap: "3px", alignItems: "center", minWidth: 0 }}>
        <Box />
        {monthLabels.map((m, i) => (
          <Typography key={i} variant="caption" sx={{ fontSize: "0.625rem", color: "text.secondary", whiteSpace: "nowrap", overflow: "visible" }}>
            {m}
          </Typography>
        ))}
        {DOW.map((label, row) => (
          <Box key={row} sx={{ display: "contents" }}>
            <Typography variant="caption" sx={{ fontSize: "0.625rem", color: "text.secondary", lineHeight: 1 }}>
              {label}
            </Typography>
            {weeks.map((w, col) => {
              const c = w[row];
              if (!c) return <Box key={col} sx={{ width: 12, height: 12 }} />;
              const title = `${fmt.format(parseDayKey(c.day))}: ${c.visits} visit${c.visits === 1 ? "" : "s"}`;
              return (
                <Tooltip key={col} title={title} placement="top" arrow>
                  <Box role="img" aria-label={title} sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: colors[level(c.visits)] }} />
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2, justifyContent: "flex-end" }}>
        <Typography variant="caption" sx={{ fontSize: "0.625rem", color: "text.secondary", mr: 0.5 }}>
          Less
        </Typography>
        {colors.map((c, i) => (
          <Box key={i} sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: c }} />
        ))}
        <Typography variant="caption" sx={{ fontSize: "0.625rem", color: "text.secondary", ml: 0.5 }}>
          More
        </Typography>
      </Box>
    </Box>
  );
}

export { addDays };
