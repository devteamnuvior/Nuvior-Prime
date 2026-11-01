"use client";

import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import type { Level } from "@/domain/performance/xp";
import { StatusChip } from "@/components/feedback/StatusChip";

const nf = new Intl.NumberFormat("en-CA");

/** Level chip, total XP and progress toward the next level. */
export function LevelBar({ level, totalXp, compact = false }: { level: Level; totalXp: number; compact?: boolean }) {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <StatusChip dot={false} tone="primary" uppercase label={`Level ${level.index + 1} · ${level.name}`} />
          <Typography variant={compact ? "caption" : "body2"} sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            {nf.format(totalXp)} XP
          </Typography>
        </Box>
        <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>
          {level.toNext != null ? `${nf.format(level.toNext)} to ${level.nextName}` : "Top level"}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={level.progress} aria-label={`${level.progress}% through ${level.name}`} sx={{ height: compact ? 5 : 6, borderRadius: 3 }} />
    </Box>
  );
}
