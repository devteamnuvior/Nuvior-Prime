"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { recordVisitAction, structureVisitNotesAction } from "@/app/actions";
import { VISIT_DURATION_OPTIONS, type VisitDurationMinutes } from "@/domain/performance/visitSlots";
import { toast } from "@/components/feedback/toast";
import { SHOW_AI_NOTE_STRUCTURING } from "@/lib/featureFlags";
import {
  VISIT_OUTCOMES,
  inferVisitOutcomeCode,
  visitOutcomeDefinition,
  type VisitOutcomeCode,
} from "@/domain/performance/visitOutcome";

const VISIT_TYPES = ["first visit", "re-visit", "follow-up on a quote"] as const;

export function VisitRecordForm({
  placeId,
  crmExternalId,
  businessName,
  embedded = false,
  checkInId = null,
  initialDurationMinutes = 45,
  onSaved,
}: {
  placeId: string;
  crmExternalId: string | null;
  businessName: string;
  /** Inside a dialog: no card chrome or own title. */
  embedded?: boolean;
  /** Called after a successful save (the dialog closes on it). */
  onSaved?: () => void;
  /** The check-in this visit closes; saved on the record so the stay and the visit stay linked. */
  checkInId?: string | null;
  /** Preselected time at clinic, e.g. suggested from the check-in / check-out stay. */
  initialDurationMinutes?: VisitDurationMinutes;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [outcomeCode, setOutcomeCode] = useState<VisitOutcomeCode | "">("");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [peopleMet, setPeopleMet] = useState("");
  const [productsDiscussed, setProductsDiscussed] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [visitType, setVisitType] = useState("first visit");
  const [durationMinutes, setDurationMinutes] = useState<VisitDurationMinutes>(initialDurationMinutes);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);

  const outcomeHint = outcomeCode ? visitOutcomeDefinition(outcomeCode).hint : "Required — pick what happened.";

  const body = (
    <>
      <Typography variant="caption" sx={{ display: "block", mb: 3, color: "text.secondary" }}>
        {businessName}
        {SHOW_AI_NOTE_STRUCTURING ? " — AI note structuring is a suggestion only (no autonomous CRM write)." : ""}
      </Typography>
      <Box
        component="form"
        sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" } }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!outcomeCode) {
            setOutcomeError("Choose an outcome before saving.");
            return;
          }
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const r = await recordVisitAction({
              placeId,
              crmExternalId,
              checkInId,
              visitDate: String(fd.get("visitDate")),
              visitType,
              durationMinutes,
              outcomeCode,
              outcome: outcomeNote,
              peopleMet,
              productsDiscussed,
              nextAction,
              followUpDate,
              notes,
            });
            setMsg(r.message);
            toast.result(r);
            if (r.ok) {
              // Refresh server data (My day panel, targets) while keeping the planned route in client state.
              router.refresh();
              setNotes("");
              setDurationMinutes(initialDurationMinutes);
              setOutcomeCode("");
              setOutcomeNote("");
              setPeopleMet("");
              setProductsDiscussed("");
              setNextAction("");
              setFollowUpDate("");
              onSaved?.();
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
        <TextField
          name="durationMinutes"
          label="Time at clinic"
          select
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value) as VisitDurationMinutes)}
          helperText={VISIT_DURATION_OPTIONS.find((o) => o.minutes === durationMinutes)?.hint}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        >
          {VISIT_DURATION_OPTIONS.map((o) => (
            <MenuItem key={o.minutes} value={o.minutes}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          name="outcomeCode"
          label="Outcome"
          select
          required
          value={outcomeCode}
          error={Boolean(outcomeError)}
          helperText={outcomeError ?? outcomeHint}
          onChange={(e) => {
            setOutcomeCode(e.target.value as VisitOutcomeCode);
            setOutcomeError(null);
          }}
          sx={{ gridColumn: { sm: "1 / -1" } }}
        >
          {VISIT_OUTCOMES.map((o) => (
            <MenuItem key={o.code} value={o.code}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField name="outcome" label="Outcome note (optional)" value={outcomeNote} onChange={(e) => setOutcomeNote(e.target.value)} />
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
        {SHOW_AI_NOTE_STRUCTURING && (
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
                if (r.structured.outcome) {
                  setOutcomeNote(r.structured.outcome);
                  const inferred = inferVisitOutcomeCode(r.structured.outcome);
                  if (inferred && !outcomeCode) {
                    setOutcomeCode(inferred);
                    setOutcomeError(null);
                  }
                }
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
        )}
        <Button type="submit" variant="contained" disabled={pending} sx={{ gridColumn: "1 / -1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {pending ? "Saving…" : "Save visit record"}
        </Button>
      </Box>
      {msg && (
        <Typography variant="caption" sx={{ display: "block", mt: 2, fontFamily: "var(--mono)", color: "primary.main" }} role="status">
          {msg}
        </Typography>
      )}
    </>
  );
  if (embedded) return body;
  return (
    <Paper variant="outlined" sx={{ p: 5 }}>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 3, color: "text.secondary" }}>
        Record visit
      </Typography>
      {body}
    </Paper>
  );
}
