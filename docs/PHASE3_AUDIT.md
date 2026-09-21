# Phase 3 — Pre-implementation audit

**Date:** 2026-08-31  
**Status:** Implementing

## What stays unchanged

- Places discovery / dedupe / progressive rings (Phase 2)
- Deterministic `qualifyAccount` scoring rubric (Phase 1)
- Exact NUVIOR taxonomy labels and `classifyPlace` rules
- CRM / auth / LLM / autonomous scraping / production deploy — deferred
- Mesoestetic never a recommendable lead product
- Mock Places remains available; enrichment is optional

## Current gaps (after Phase 2)

1. `FieldEvidence` exists but lacks verification state, snippet, source title.
2. Prospecting sets clinical fields to `UNKNOWN, verify` or mock CRM — no website enrichment.
3. No pluggable `EnrichmentProvider` separate from Places.
4. No verification queue UI.
5. Briefs cannot include source-backed practitioner/service facts.

## Proposed pipeline

```
Discovery → Dedup → classifyPlace → Enrichment (optional) →
Evidence aggregation → Qualification → Verification items → Visit list / Brief
```

Enrichment runs **after** taxonomy classification and **before** qualification so scoring can consume explicit website signals without inventing them.

## Proposed modules

| Module | Role |
|---|---|
| `EnrichmentProvider` | Interface: enrich(account) → facts + evidence |
| `WebsiteEnrichmentProvider` | Same-domain page fetch + deterministic extractors |
| `aggregateEvidence` | Resolve multi-source fields; conflicts → `CONFLICT, verify` |
| `buildVerificationQueue` | Flatten AMBIGUOUS / UNKNOWN / CONFLICT / MANUAL_VERIFY |
| `WebsitePageCache` (Prisma) | Cache fetched HTML/text by URL |

## Qualification inputs enrichment may affect (explicit only)

| Input | When enrichment may set it |
|---|---|
| `credentials.hasPhysicianOrNp` | Explicit MD/NP (or “Medical Director” with MD) on page |
| `credentials.hasRn` / `hasNd` | Explicit RN / ND credentials displayed |
| `credentials.physicianOrNpOnSiteForPrp` | Same as physician/NP evidence |
| `advertisesThreadLifting` | Explicit thread-lift / PDO / PLLA language (not generic “lift”) |
| `injectablesOffered` | Explicit injectable/toxin/filler/PRP language |
| `threadsOffered` | Explicit thread offering + optional brand if named |
| `skincareLines` | Explicit brand names from known bank |
| `pricePositioning` | Only if premium/luxury language is explicit; else leave unknown |
| `formerMesoesteticCustomer` | **Never set from website alone** (CRM-only). Mesoestetic brand on site → competitive signal evidence only |

No hidden scoring weights. Same Phase 1 rubric.

## Non-goals

- LLM fact generation
- Login walls / patient portals / form posts
- Full-site crawls
- Overwriting CRM internal status from website
- Replacing Places discovery

## Assumptions

| ID | Assumption |
|---|---|
| A14 | Prefer homepage, about/team, services, contact, booking, shop — max N pages |
| A15 | Extraction is keyword/regex; keyword hit ≠ VERIFIED_SOURCE without clear credential/brand context |
| A16 | Enrichment budget defaults keep Toronto validation cheap (5 accounts) |
| A17 | Mock Places accounts without websites skip live fetch; fixture HTML used in tests |
