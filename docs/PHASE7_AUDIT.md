# Phase 7 — Pre-implementation audit

**Date:** 2026-08-31  
**Status:** Complete (import path; no live vendor API)  
**Scope:** Read-only real/internal CRM source behind `CrmProvider` — **no invented vendor APIs**.

## Current CRM contract

`CrmProvider` (Phase 4): getById, search, list, status-by-place/name, visit history, revisits due, already-visited-not-due, `isUnavailable()`.

Canonical type: `CrmInternalAccount`.

Modes today: `mock` | `unavailable` (env). Unknown providers previously **fell back to mock** — Phase 7 removes silent mock fallback for real modes.

## Source discovery result

| Candidate | Status in repository |
|---|---|
| Named CRM REST vendor | **Not available** (U2) |
| Academy API schema | **Not available** |
| Order-system API | **Not available** |
| Live DB connection string / view DDL | **Not available** |
| Structured export (CSV/JSON) | **Supported path for Phase 7** |

**Selected source for Phase 7:** controlled **multi-file import** into a staging + canonical mirror (`CRM_PROVIDER=import`).

`CRM_PROVIDER=api` is reserved: if selected without a configured real base URL, the provider is **unavailable** (fail-closed). No endpoints invented.

## Source schema gaps

Import format is the NUVIOR Prime **internal export contract** (documented). Live systems must map into this contract (or future adapters). Missing fields stay null/unknown — never inferred from Places/web.

## Read-only integration plan

1. Validate import files (accounts / academy / orders / dnc / visits).  
2. Stage raw rows (`CrmSourceRecord`).  
3. Normalize → merge by precedence → `CanonicalCrmAccount`.  
4. `ImportCrmProvider` reads canonical mirror only.  
5. Matching / DNC / cert / Meso / last-order / RBAC unchanged.

## Identifier strategy

- Primary: `crmExternalId` from source  
- Optional: Google Place ID when supplied by export  
- Matching hierarchy (Phase 4) unchanged; verified mappings win

## Synchronization strategy

Manual/CLI import (no background jobs). Dry-run supported. Freshness = `importedAt` / `CRM_CACHE_TTL` for “stale” UI indicator only (data remains usable but flagged).

## Failure modes

| Mode | Behavior |
|---|---|
| `import` with empty/failed mirror | `isUnavailable()=true` — no mock accounts |
| `api` without URL | unavailable — no mock |
| DNC source missing in merge | account-level DNC unverified / conservative (see docs) |
| Malformed row | rejected; import continues; reported |

## Security constraints

Credentials server-side only (if API later). No secrets in logs/audit/LLM. Territory + RBAC still gate all reads via app layer. Import requires `admin.settings` when run from app; CLI is ops-local.

## Out of scope

Production deploy · CRM writes · outreach · background agents · drive-time · invented vendor endpoints.
