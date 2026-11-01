"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import { CodeChip, StatusChip, type StatusTone } from "@/components/feedback/StatusChip";
import { EmptyState } from "@/components/feedback/EmptyState";
import { UserAvatar } from "@/components/admin/UserAvatar";
import { formatRelative } from "@/components/admin/userPresentation";
import { REP_LIVE_STATUS_LABELS, type LiveRepDto, type RepLiveStatus } from "@/domain/live/positions";

export const STATUS_TONE: Record<RepLiveStatus, StatusTone> = {
  at_clinic: "success",
  travelling: "primary",
  idle: "warning",
  offline: "neutral",
};

/** Side list: every rep with status, where they are and when we last heard from them. */
export function RepPanel({
  reps,
  selectedId,
  recentIds,
  query,
  onQuery,
  onFocus,
  now,
}: {
  reps: LiveRepDto[];
  selectedId: string | null;
  recentIds: Set<string>;
  query: string;
  onQuery: (q: string) => void;
  onFocus: (id: string) => void;
  now: number;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, height: 1 }}>
      <Box sx={{ px: 4, pt: 4, pb: 3, borderBottom: 1, borderColor: "divider" }}>
        <TextField
          size="small"
          fullWidth
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Find a rep or clinic"
          slotProps={{
            htmlInput: { "aria-label": "Find a rep or clinic" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined sx={{ fontSize: 18, color: "text.disabled" }} />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Box component="ul" className="nv-scroll" sx={{ flex: 1, minHeight: 0, overflowY: "auto", m: 0, p: 2, listStyle: "none", display: "grid", gap: 1, alignContent: "start" }}>
        {reps.length === 0 && (
          <Box component="li" sx={{ py: 8 }}>
            <EmptyState compact title="No reps here" description={query ? "Nothing matches your search." : "No active reps in this province yet."} />
          </Box>
        )}
        {reps.map((r) => {
          const selected = r.id === selectedId;
          const recent = recentIds.has(r.id);
          const hasFix = !!r.position;
          return (
            <li key={r.id}>
              <ButtonBase
                onClick={() => hasFix && onFocus(r.id)}
                disabled={!hasFix}
                aria-pressed={selected}
                aria-label={`${r.name}, ${REP_LIVE_STATUS_LABELS[r.status]}${r.position?.clinic ? ` at ${r.position.clinic.name}` : ""}`}
                sx={{
                  width: 1,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 3,
                  px: 3,
                  py: 2.5,
                  textAlign: "left",
                  borderRadius: 2,
                  border: 1,
                  borderColor: selected ? "primary.main" : "transparent",
                  bgcolor: selected ? "primary.tint" : "transparent",
                  opacity: hasFix ? 1 : 0.6,
                  transition: (t) => t.transitions.create(["background-color", "border-color", "box-shadow"], { duration: t.transitions.duration.short }),
                  boxShadow: recent && !selected ? "0 0 0 1px rgba(var(--nv-palette-primary-mainChannel) / 0.35)" : "none",
                  "&:hover": { bgcolor: selected ? "primary.tint" : "action.hover" },
                  "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
                }}
              >
                <Box sx={{ position: "relative", flexShrink: 0, mt: 0.5 }}>
                  <UserAvatar name={r.name} email={r.email} size="sm" />
                  <Box
                    aria-hidden
                    sx={{
                      position: "absolute",
                      right: -1,
                      bottom: -1,
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      bgcolor: r.status === "at_clinic" ? "success.main" : r.status === "travelling" ? "primary.main" : r.status === "idle" ? "warning.main" : "text.disabled",
                      boxShadow: "0 0 0 2px var(--nv-palette-background-paper)",
                    }}
                  />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1, display: "grid", gap: 0.75 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                      {r.name}
                    </Typography>
                    {r.provinces.slice(0, 1).map((p) => (
                      <CodeChip key={p} label={p} />
                    ))}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <StatusChip tone={STATUS_TONE[r.status]} label={REP_LIVE_STATUS_LABELS[r.status]} sx={{ height: 20, fontSize: "0.6875rem" }} />
                    <Typography variant="caption" noWrap sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                      {r.position ? formatRelative(r.position.recordedAt, now) : "No position yet"}
                    </Typography>
                  </Box>
                  {r.position?.clinic && (
                    <Typography variant="caption" noWrap sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.primary" }}>
                      <StorefrontOutlined sx={{ fontSize: 14, color: "success.main", flexShrink: 0 }} />
                      <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.position.clinic.name} · {r.position.clinic.city}
                      </Box>
                    </Typography>
                  )}
                  {r.position && !r.position.clinic && r.status === "travelling" && r.position.speedMps != null && (
                    <Typography variant="caption" noWrap sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                      {Math.round(r.position.speedMps * 3.6)} km/h between visits
                    </Typography>
                  )}
                </Box>
              </ButtonBase>
            </li>
          );
        })}
      </Box>
    </Box>
  );
}
