import { z } from "zod";

/** Narrative fields only — lead product labels must match locked facts after merge. */
export const llmBriefNarrativeSchema = z.object({
  accountSummary: z.string().min(1).max(600),
  snapshotThreeLines: z.tuple([z.string(), z.string(), z.string()]),
  leadProductWhy: z.string().min(1).max(400),
  secondProductIfFirstLands: z.string().min(1).max(200),
  openingLines: z.object({
    cold: z.string().min(1).max(200),
    knowsNuvior: z.string().min(1).max(200),
    revisit: z.string().min(1).max(200),
  }),
  fiveQuestions: z.array(z.string().min(1)).length(5),
  signalsToReadOnSite: z.array(z.string().min(1)).length(5),
  objectionsAndResponses: z
    .array(
      z.object({
        objection: z.string().min(1),
        response: z.string().min(1),
      }),
    )
    .length(3),
  theAsk: z.string().min(1).max(300),
  leaveBehind: z.string().min(1).max(300),
  doNotSay: z.array(z.string().min(1)).min(2).max(5),
  confirmOnSite: z.array(z.string()).max(8).optional(),
});

export type LlmBriefNarrative = z.infer<typeof llmBriefNarrativeSchema>;

export const structuredVisitNotesSchema = z.object({
  visitType: z.enum(["first visit", "re-visit", "follow-up on a quote"]).optional(),
  outcome: z.string().nullable(),
  peopleMet: z.string().nullable(),
  productsDiscussed: z.string().nullable(),
  nextAction: z.string().nullable(),
  followUpDate: z.string().nullable(),
  notes: z.string().nullable(),
  warnings: z.array(z.string()).default([]),
});

export type StructuredVisitNotes = z.infer<typeof structuredVisitNotesSchema>;

export const accountSummarySchema = z.object({
  summary: z.string().min(1).max(600),
  confirmOnSite: z.array(z.string()).max(6).default([]),
});

export type AccountSummaryResult = z.infer<typeof accountSummarySchema>;
