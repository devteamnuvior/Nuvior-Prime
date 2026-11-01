"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import { removeSalesTargetAction, setSalesTargetAction } from "@/app/actions";
import type { SalesTargetRow } from "@/lib/performance";
import {
  TARGET_METRICS,
  TARGET_METRIC_LABELS,
  TARGET_PERIODS,
  TARGET_PERIOD_LABELS,
  resolveActiveTarget,
  type TargetMetric,
  type TargetPeriod,
} from "@/domain/performance/targets";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { StatusChip } from "@/components/feedback/StatusChip";
import { toast } from "@/components/feedback/toast";

const PERIOD_ORDER: Record<TargetPeriod, number> = { DAY: 0, WEEK: 1, MONTH: 2 };

export function TargetsEditor({
  userId,
  targets,
  today,
  canManage,
}: {
  userId: string;
  targets: SalesTargetRow[];
  today: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [period, setPeriod] = React.useState<TargetPeriod>("DAY");
  const [metric, setMetric] = React.useState<TargetMetric>("VISITS");
  const [value, setValue] = React.useState("");
  const [startsOn, setStartsOn] = React.useState(today);
  const [endsOn, setEndsOn] = React.useState("");
  const [note, setNote] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = React.useState<SalesTargetRow | null>(null);

  const sorted = React.useMemo(
    () => [...targets].sort((a, b) => PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period] || a.metric.localeCompare(b.metric) || b.startsOn.localeCompare(a.startsOn)),
    [targets],
  );
  const activeIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const p of TARGET_PERIODS) for (const m of TARGET_METRICS) {
      const t = resolveActiveTarget(targets, p, m, today);
      if (t) ids.add(t.id);
    }
    return ids;
  }, [targets, today]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    start(async () => {
      const r = await setSalesTargetAction({ userId, period, metric, value: Number(value), startsOn, endsOn: endsOn || null, note: note || null });
      toast.result(r);
      if (r.ok) {
        setValue("");
        setNote("");
        setEndsOn("");
        router.refresh();
      } else if (r.fieldErrors) {
        setErrors(r.fieldErrors);
      }
    });
  };

  const remove = (t: SalesTargetRow) => {
    start(async () => {
      const r = await removeSalesTargetAction(t.id);
      toast.result(r);
      if (r.ok) router.refresh();
    });
  };

  return (
    <Box sx={{ display: "grid", gap: 4 }}>
      {sorted.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No targets yet{canManage ? " — set the first one below." : "."}
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}>
          {sorted.map((t) => {
            const active = activeIds.has(t.id);
            const expired = !!t.endsOn && t.endsOn < today;
            const future = t.startsOn > today;
            return (
              <Box
                component="li"
                key={t.id}
                sx={{ display: "flex", alignItems: "center", gap: 3, px: 3, py: 2, borderRadius: 1.5, bgcolor: active ? "action.selected" : "background.sunken", opacity: expired ? 0.6 : 1 }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {TARGET_PERIOD_LABELS[t.period]} · {TARGET_METRIC_LABELS[t.metric]}
                  </Typography>
                  <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
                    from {t.startsOn}
                    {t.endsOn ? ` to ${t.endsOn}` : ""}
                    {t.note ? ` · ${t.note}` : ""}
                  </Typography>
                </Box>
                <Typography variant="h3" component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {t.value}
                </Typography>
                <StatusChip
                  dot={false}
                  uppercase
                  tone={active ? "success" : expired ? "neutral" : future ? "info" : "neutral"}
                  label={active ? "Active" : expired ? "Ended" : future ? "Upcoming" : "Superseded"}
                />
                {canManage && (
                  <Tooltip title="Remove target">
                    <span>
                      <IconButton size="small" aria-label={`Remove ${TARGET_METRIC_LABELS[t.metric]} target`} disabled={pending} onClick={() => setConfirmRemove(t)}>
                        <DeleteOutlineOutlined fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {canManage && (
        <Box component="form" onSubmit={submit} sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" }, pt: 3, borderTop: 1, borderColor: "divider" }}>
          <TextField select size="small" label="Period" value={period} onChange={(e) => setPeriod(e.target.value as TargetPeriod)}>
            {TARGET_PERIODS.map((p) => (
              <MenuItem key={p} value={p}>
                {TARGET_PERIOD_LABELS[p]}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Metric" value={metric} onChange={(e) => setMetric(e.target.value as TargetMetric)}>
            {TARGET_METRICS.map((m) => (
              <MenuItem key={m} value={m}>
                {TARGET_METRIC_LABELS[m]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Target value"
            type="number"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={!!errors.value}
            helperText={errors.value}
            slotProps={{ htmlInput: { min: 0, max: 10000, step: 1 } }}
          />
          <TextField size="small" label="Starts on" type="date" required value={startsOn} onChange={(e) => setStartsOn(e.target.value)} error={!!errors.startsOn} helperText={errors.startsOn} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="Ends on (optional)" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} error={!!errors.endsOn} helperText={errors.endsOn} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
          <Box sx={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant="contained" loading={pending} disabled={!value}>
              Save target
            </Button>
          </Box>
        </Box>
      )}

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="Remove this target?"
        description={confirmRemove ? `${TARGET_PERIOD_LABELS[confirmRemove.period]} ${TARGET_METRIC_LABELS[confirmRemove.metric]} target of ${confirmRemove.value} from ${confirmRemove.startsOn}. This is recorded in the audit log.` : ""}
        confirmLabel="Remove target"
        destructive
        onConfirm={() => {
          if (confirmRemove) remove(confirmRemove);
          setConfirmRemove(null);
        }}
      />
    </Box>
  );
}
