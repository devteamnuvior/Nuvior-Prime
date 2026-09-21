# LLM synthesis — Phase 5

Evidence-grounded narrative only. Phase 1–4 deterministic logic remains authoritative.

## What the LLM may do

- Polish pre-visit brief **narrative** (snapshot, openings, questions, objections, ask, leave-behind, do-not-say)
- Produce a short **account summary** (display only)
- Tailor questions/objections from locked facts + evidence
- **Suggest** structured visit-note fields from freeform text

## What the LLM must never own

DNC · CRM status · certification · taxonomy · fit score · lead product · revisit eligibility · identity matching.

These are passed as **locked facts**, re-applied on merge (`leadProductForVisit` always from qualification), and validated after generation.

## Providers

| `LLM_PROVIDER` | Behavior |
|---|---|
| `none` (default) | Template briefs only |
| `mock` | Deterministic heuristic synthesis (tests / local) |
| `openai` | Chat Completions JSON (`OPENAI_API_KEY`, `OPENAI_MODEL`) — falls back to mock if key missing |

## Pipeline

```
template brief (always)
  → optional LlmProvider.complete(brief_narrative)
  → Zod schema + safety scan
  → merge narrative; keep locked lead label
  → on failure: generator=llm_fallback (template body)
```

## Safety

Blocked: guaranteed / permanent / cures · Mesoestetic as lead · future Mesoestetic supply claims · patient identifiers. Openings clamped to ≤25 words.

## Caching

`LlmResponseCache` keyed by prompt hash. TTL: `LLM_CACHE_TTL_SECONDS` (default 86400).

## Config

```
LLM_PROVIDER=none|mock|openai
LLM_ENABLED_FOR_BRIEFS=true
LLM_MAX_ACCOUNTS_PER_RUN=5
LLM_CACHE_TTL_SECONDS=86400
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

## Fallback

Any provider/schema/safety failure → template brief with `generator=llm_fallback` and reason in `llmMeta`.

## Evaluation

`src/domain/llm/llm.phase5.test.ts` — safety, schema, merge lock, visit-note structuring, prospecting wiring (mock only; no live API required).

## Out of scope

Auth · audit · deploy · drive-time · real CRM · autonomous outreach · email/SMS · background agents · autonomous CRM writes.
