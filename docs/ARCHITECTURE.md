# NUVIOR Prime — Architecture

**Source of truth:** `docs/NUVIOR_PRIME_SPEC.md` (v2.1)  
**Status:** Phase 8 — drive-time routing & visit-window feasibility  
**Date:** 2026-08-31

---

## Pipeline

```
Auth → Discovery → Dedup → Classify → Enrich → CRM → Qualify → DNC/revisit →
Candidate pool → Travel matrix → Feasibility → Route optimization → Visit list → Brief
```

## Providers

| Provider | Role |
|---|---|
| Auth.js | Local credentials; OIDC-ready |
| Places / Enrichment / CRM / LLM | Phases 2–7 |
| **Product catalog** | Stage B — `mock` \| `odoo` (stub) \| `unavailable`; canonical `NuviorProduct[]` |
| **Clinic research** | Stage C — `mock` \| `claude` \| `disabled`; `ClinicCapabilityProfile` extraction |
| **Product gap engine** | Stage D — deterministic `ProductGapAnalysis`; parallel to qualification |
| **Product opportunity scoring** | Stage E — deterministic ranking + primary recommendation from gaps |
| Routing | `geodesic` \| `mock` \| `google` (Routes API matrix) |

## Phase 8

- Pluggable routing + matrix/cache/budgets
- Max radius + optional max drive minutes
- Deterministic utility optimizer (fit / revisit / travel / schedule)
- Opening-hours feasibility + suggested drop-in window
- Workday / visit duration / lunch
- Immutable route snapshots on visit-run items
- See `ROUTING.md`, `ROUTE_OPTIMIZATION.md`, `ROUTING_RUNBOOK.md`, `PHASE8_AUDIT.md`

## Phase 6

- Users, roles, permissions, territory gates
- Server-side authorization on all sensitive actions
- Visit-run / visit-record ownership
- Account assignment (app-level)
- Append-only audit log
- See `AUTHENTICATION.md`, `AUTHORIZATION.md`, `AUDIT_LOGGING.md`, `SECURITY_MODEL.md`

## Hard rules

- DNC never overridden by role; unverified DNC ≠ safe to contact
- Real CRM modes never silently fall back to mock customer data
- **Product catalog:** Odoo mode never silently falls back to mock; credentials server-side only
- LLM / Places ownership rules from Phases 3–5 unchanged
- **Product opportunity:** Stage E scoring is deterministic; Account Fit and route priority unchanged; DNC blocks actionable primary
- UI navigation adapts to permissions; enforcement is always server-side
