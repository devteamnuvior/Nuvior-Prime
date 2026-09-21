# Phase 5 — Pre-implementation audit

**Date:** 2026-08-31  
**Status:** Complete (LLM synthesis; auth/deploy/CRM vendor still deferred)

## Current state (authoritative without LLM)

| Layer | Role |
|---|---|
| Qualification / taxonomy / fit / lead | Deterministic — Phase 1 |
| Places / enrichment evidence | Public facts — Phases 2–3 |
| CRM match / DNC / cert / revisit | Internal overlay — Phase 4 |
| Pre-visit brief | Template generator (`generator: "template"`) — spec §09 |

## What LLM may do in Phase 5

- Polish / tailor **narrative** brief sections from locked facts + evidence snippets
- Produce short **account summaries** (non-authoritative display)
- Reword **questions / objections** for the account (bank-grounded)
- **Structure** freeform visit notes into fields (suggestion only — no autonomous CRM write)

## What LLM must never own

DNC · CRM status · certification · taxonomy · fit score · lead product · revisit eligibility · account identity matching.

These are injected as **locked facts** and re-applied / validated after any LLM output.

## Design

1. Always build the template brief first (fallback + locked lead).
2. Optional `LlmProvider` (`none` | `mock` | `openai`) synthesizes narrative overlays.
3. Zod schema validation + safety filters; on failure → template (`llm_fallback`).
4. Cache responses by prompt hash; show provenance (model, cache, evidence refs).
5. Evaluation tests use mock provider only (no live API required).

## Out of scope (explicit)

Auth · roles · audit system · production deploy · drive-time · real CRM · autonomous outreach · email/SMS · background agents · autonomous CRM writes.
