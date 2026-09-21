# Phase 2 — Required changes (pre-implementation audit)

**Date:** 2026-08-31  
**Status:** Implementing

## What stays unchanged

- Deterministic qualification engine (`qualifyAccount`)
- Scope-of-practice rules and taxonomy seed labels
- CRM / auth / LLM / scraping deferred
- Mock provider remains default when credentials absent
- Mesoestetic never a lead product

## Changes required

### A. Places contract

Phase 1 `RawPlace` incorrectly embeds NUVIOR `segmentNumber` / `categoryNumber` / `organizationType`.  
Google cannot supply NUVIOR taxonomy. **Refactor:** provider returns place evidence only; domain classifier assigns taxonomy.

### B. Discovery orchestration (new domain module)

Progressive radius expansion, multi-keyword Text Search, dedupe by Place ID then name+address, cost caps.  
Lives outside Google-specific code and outside the qualification engine.

### C. Provenance

Extend place payloads + optional `PlacesApiCache` table with provider, record ID, fetchedAt, source URL, needsVerification.  
Never write Places fields into `AccountInternalStatus`.

### D. Routing

Add `RoutingProvider` interface (haversine default). Drive-time optional later — not used by qualification.

### E. UI / validation

Dev status strip: provider, discovered, deduped, qualified, radius reached.  
Toronto validation script (`M5V 2T6`, target 20, 40 km, min fit 3).

### F. Config

`PLACES_PROVIDER`, `GOOGLE_PLACES_API_KEY`, search/detail/cache limits in `.env.example`.
