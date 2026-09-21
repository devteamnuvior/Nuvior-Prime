# Phase 4 — Pre-implementation audit

**Date:** 2026-08-31  
**Status:** Complete (mock CRM; real vendor deferred)

## Current CRM abstractions

| Piece | Phase 4 |
|---|---|
| `CrmProvider` | Full interface: getById, search, list, status, visits, revisits, unavailable |
| `MockCrmProvider` | Expanded fixtures + outage mode |
| Matching | `matchPublicToCrm` + persisted `CrmAccountMapping` |
| Visit history | `VisitRecord` + CRM visit history API |
| Visit runs | Snapshots on each search (`VisitListRun` / `VisitListItem`) |

## What stayed unchanged

- Places discovery, enrichment, deterministic qualification rubric
- Public evidence model / verification queue
- Mesoestetic never a lead product
- No auth, LLM scoring, background jobs, or production deploy

## Delivered

1. Expanded `CrmProvider` + mock dataset  
2. Deterministic matching with confidence states + mappings  
3. Ownership module; central DNC; CRM revisit merge  
4. Certification / former Mesoestetic / last-order derived status  
5. Visit records + visit-run snapshots  
6. Dev UI: CRM panel, matching queue, visit form  
7. Docs + Toronto CRM overlay validation  

## Unresolved real-CRM dependencies

| ID | Dependency |
|---|---|
| U2 | Real CRM/academy API or export schema |
| U7 | Authoritative DNC master list source |
| U8 | Canonical Place ID ↔ CRM ID mapping table (if exists upstream) |
| U9 | Rep identity / assignment source (auth deferred) |

No vendor endpoints invented. Adapter boundary + mock only until credentials/schema exist.
