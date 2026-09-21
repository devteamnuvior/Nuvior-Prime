"use client";

import { useState, useTransition } from "react";
import { recordVisitAction, structureVisitNotesAction } from "@/app/actions";

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
    <div className="border border-rule bg-panel p-5">
      <h3
        className="mb-3 text-[0.75rem] font-semibold tracking-[0.14em] text-muted uppercase"
        style={{ fontFamily: "var(--display)" }}
      >
        Record visit (dev)
      </h3>
      <p className="mb-3 text-xs text-muted">
        {businessName} — no auth; rep placeholder = rep.dev. AI note structuring is a suggestion
        only (no autonomous CRM write).
      </p>
      <form
        className="grid gap-2 text-sm md:grid-cols-2"
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
        <label className="text-xs">
          Visit date
          <input
            name="visitDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full border border-rule bg-canvas px-2 py-1"
          />
        </label>
        <label className="text-xs">
          Visit type
          <select
            name="visitType"
            value={visitType}
            onChange={(e) => setVisitType(e.target.value)}
            className="mt-1 w-full border border-rule bg-canvas px-2 py-1"
          >
            <option value="first visit">first visit</option>
            <option value="re-visit">re-visit</option>
            <option value="follow-up on a quote">follow-up on a quote</option>
          </select>
        </label>
        <label className="text-xs">
          Outcome
          <input
            name="outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="mt-1 w-full border border-rule bg-canvas px-2 py-1"
          />
        </label>
        <label className="text-xs">
          People met
          <input
            name="peopleMet"
            value={peopleMet}
            onChange={(e) => setPeopleMet(e.target.value)}
            className="mt-1 w-full border border-rule bg-canvas px-2 py-1"
          />
        </label>
        <label className="text-xs">
          Products discussed
          <input
            name="productsDiscussed"
            value={productsDiscussed}
            onChange={(e) => setProductsDiscussed(e.target.value)}
            className="mt-1 w-full border border-rule bg-canvas px-2 py-1"
          />
        </label>
        <label className="text-xs">
          Follow-up date
          <input
            name="followUpDate"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="mt-1 w-full border border-rule bg-canvas px-2 py-1"
          />
        </label>
        <label className="text-xs md:col-span-2">
          Next action
          <input
            name="nextAction"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            className="mt-1 w-full border border-rule bg-canvas px-2 py-1"
          />
        </label>
        <label className="text-xs md:col-span-2">
          Notes
          <textarea
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full border border-rule bg-canvas px-2 py-1"
          />
        </label>
        <button
          type="button"
          disabled={pending || !notes.trim()}
          className="border border-rule px-3 py-2 text-xs text-muted"
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
        </button>
        <button
          type="submit"
          disabled={pending}
          className="border border-accent bg-accent px-3 py-2 text-xs font-semibold tracking-wide text-white uppercase"
          style={{ fontFamily: "var(--display)" }}
        >
          {pending ? "Saving…" : "Save visit record"}
        </button>
      </form>
      {msg && <p className="mt-2 font-mono text-[0.68rem] text-accent">{msg}</p>}
    </div>
  );
}
