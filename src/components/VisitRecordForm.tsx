"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { recordVisitAction, structureVisitNotesAction } from "@/app/actions";
import { toast } from "@/components/feedback/toast";

const VISIT_TYPES = ["first visit", "re-visit", "follow-up on a quote"] as const;

export function VisitRecordForm({
  placeId,
  crmExternalId,
  businessName,
}: {
  placeId: string;
  crmExternalId: string | null;
  businessName: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [peopleMet, setPeopleMet] = useState("");
  const [productsDiscussed, setProductsDiscussed] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [visitType, setVisitType] = useState("first visit");

  return (
    <Paper variant="outlined" sx={{ p: 5 }}>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 3, color: "text.secondary" }}>
        Record visit (dev)
      </Typography>
      <Typography variant="caption" sx={{ display: "block", mb: 3, color: "text.secondary" }}>
        {businessName} — no auth; rep placeholder = rep.dev. AI note structuring is a suggestion
        only (no autonomous CRM write).
      </Typography>
      <Box
        component="form"
        sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const r = await recordVisitAction({
              placeId,
              crmExternalId,
              visitDate: String(fd.get("visitDate")),
              visitType,
              outcome: outcome || String(fd.get("outcome") || ""),
              peopleMet: peopleMet || String(fd.get("peopleMet") || ""),
              productsDiscussed: productsDiscussed || String(fd.get("productsDiscussed") || ""),
              nextAction: nextAction || String(fd.get("nextAction") || ""),
              followUpDate: followUpDate || String(fd.get("followUpDate") || ""),
              notes,
            });
            setMsg(r.message);
            toast.result(r);
            if (r.ok) {
              setNotes("");
              setOutcome("");
              setPeopleMet("");
              setProductsDiscussed("");
              setNextAction("");
              setFollowUpDate("");
            }
          });
        }}
      >
        <TextField
          name="visitDate"
          label="Visit date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField name="visitType" label="Visit type" select value={visitType} onChange={(e) => setVisitType(e.target.value)}>
          {VISIT_TYPES.map((v) => (
            <MenuItem key={v} value={v}>
              {v}
            </MenuItem>
          ))}
        </TextField>
        <TextField name="outcome" label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
        <TextField name="peopleMet" label="People met" value={peopleMet} onChange={(e) => setPeopleMet(e.target.value)} />
        <TextField name="productsDiscussed" label="Products discussed" value={productsDiscussed} onChange={(e) => setProductsDiscussed(e.target.value)} />
        <TextField
          name="followUpDate"
          label="Follow-up date"
          type="date"
          value={followUpDate}
          onChange={(e) => setFollowUpDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField name="nextAction" label="Next action" value={nextAction} onChange={(e) => setNextAction(e.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }} />
        <TextField
          name="notes"
          label="Notes"
          multiline
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        />
        <Button
          type="button"
          variant="outlined"
          disabled={pending || !notes.trim()}
          sx={{ gridColumn: "1 / -1" }}
          onClick={() =>
            start(async () => {
              const r = await structureVisitNotesAction(notes, placeId);
              if (!r.ok) {
                setMsg(r.message);
                return;
              }
              if (r.structured.outcome) setOutcome(r.structured.outcome);
              if (r.structured.peopleMet) setPeopleMet(r.structured.peopleMet);
              if (r.structured.productsDiscussed) {
                setProductsDiscussed(r.structured.productsDiscussed);
              }
              if (r.structured.nextAction) setNextAction(r.structured.nextAction);
              if (r.structured.followUpDate) setFollowUpDate(r.structured.followUpDate);
              if (r.structured.visitType) setVisitType(r.structured.visitType);
              if (r.structured.notes) setNotes(r.structured.notes);
              setMsg(
                `Structured via ${r.provider}/${r.model}${r.cacheHit ? " (cache)" : ""} — review before save`,
              );
            })
          }
        >
          Structure notes with AI
        </Button>
        <Button type="submit" variant="contained" disabled={pending} sx={{ gridColumn: "1 / -1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {pending ? "Saving…" : "Save visit record"}
        </Button>
      </Box>
      {msg && (
        <Typography variant="caption" sx={{ display: "block", mt: 2, fontFamily: "var(--mono)", color: "primary.main" }} role="status">
          {msg}
        </Typography>
      )}
    </Paper>
  );
}
