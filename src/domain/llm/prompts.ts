import type { SynthesisContext } from "./lockedFacts";

export function buildBriefSystemPrompt(): string {
  return [
    "You are a NUVIOR sales enablement assistant for Canadian aesthetic clinics.",
    "You rewrite brief narrative only. You do NOT choose lead product, fit score, taxonomy, DNC, certification, or CRM status.",
    "Use only provided locked facts and evidence. If unknown, say the rep should confirm on site — never invent practitioners, phones, or addresses.",
    "Never recommend Mesoestetic as a lead or long-term line. Former Mesoestetic → Dermaceutic retention language only.",
    "Health Canada language: use can/may/results vary — never will/guaranteed/permanent/cures.",
    "No patient information. No disparaging named competitor product comparisons.",
    "Opening lines must be under 25 words each and contain no product pitch.",
    "Return valid JSON matching the requested schema only.",
  ].join(" ");
}

export function buildBriefUserPrompt(ctx: SynthesisContext): string {
  return JSON.stringify(
    {
      task: "pre_visit_brief_narrative",
      lockedFacts: ctx.locked,
      evidence: ctx.evidence.slice(0, 40),
      knownPublic: ctx.knownPublic,
      lastVisitNotes: ctx.lastVisitNotes,
      thinInputWarnings: ctx.thinInputWarnings,
      templateBaseline: ctx.templateBaseline,
      outputSchema: {
        accountSummary: "2-3 sentences",
        snapshotThreeLines: ["clinic", "buyer", "what they sell"],
        leadProductWhy: "one sentence why THIS locked lead, this clinic, this month",
        secondProductIfFirstLands: "one line",
        openingLines: { cold: "", knowsNuvior: "", revisit: "" },
        fiveQuestions: ["5 questions from standing bank, reworded"],
        signalsToReadOnSite: ["5 concrete signals"],
        objectionsAndResponses: [{ objection: "", response: "" }],
        theAsk: "",
        leaveBehind: "",
        doNotSay: ["2-3 lines"],
        confirmOnSite: ["optional"],
      },
    },
    null,
    2,
  );
}

export function buildAccountSummaryUserPrompt(ctx: SynthesisContext): string {
  return JSON.stringify(
    {
      task: "account_summary",
      lockedFacts: {
        accountName: ctx.locked.accountName,
        taxonomy: `Seg ${ctx.locked.segmentNumber} ${ctx.locked.categoryLabel}`,
        leadProductLabel: ctx.locked.leadProductLabel,
        fitScore: ctx.locked.fitScore,
        openingAngle: ctx.locked.openingAngle,
        formerMesoesteticCustomer: ctx.locked.formerMesoesteticCustomer,
      },
      evidence: ctx.evidence.slice(0, 20),
      knownPublic: ctx.knownPublic,
      outputSchema: { summary: "string", confirmOnSite: ["string"] },
    },
    null,
    2,
  );
}

export function buildVisitNotesSystemPrompt(): string {
  return [
    "Structure freeform NUVIOR sales visit notes into JSON fields.",
    "Do not invent people, products, or dates not present in the notes.",
    "Never include patient clinical details. If notes look like PHI, put a warning and omit it.",
    "Return JSON only.",
  ].join(" ");
}

export function buildVisitNotesUserPrompt(rawNotes: string): string {
  return JSON.stringify({
    task: "structure_visit_notes",
    rawNotes,
    outputSchema: {
      visitType: "first visit | re-visit | follow-up on a quote | omit",
      outcome: "string|null",
      peopleMet: "string|null",
      productsDiscussed: "string|null",
      nextAction: "string|null",
      followUpDate: "YYYY-MM-DD|null",
      notes: "cleaned notes|null",
      warnings: ["string"],
    },
  });
}
