# Phase 6 — Pre-implementation audit

**Date:** 2026-08-31  
**Status:** Complete

## Current unauthenticated surfaces

| Surface | Phase 6 |
|---|---|
| App routes | Middleware requires JWT |
| Server actions | `requireSessionUser` + permissions + territory |
| Login | `/login` public |

## Write operations (must authorize + audit)

- Visit list run persistence
- Visit record create
- CRM mapping confirm/reject
- (Phase 6) User create/update/role/territory
- (Phase 6) Account assignment
- Brief regeneration (AI) metadata

## Sensitive internal data

CRM DNC, academy/cert, former Mesoestetic, last order, revisit, CRM external IDs, mapping confidence, LLM cache, audit-worthy notes.

## Admin/developer-only today

Matching queue, CRM status panel, evidence inspector, visit form, provenance — all exposed to anyone.

## Proposed roles

| Role | Intent |
|---|---|
| `REP` | Provincial sales rep |
| `MANAGER` | Regional / team manager |
| `ADMIN` | System administrator |

## Permission matrix (summary)

| Permission | REP | MANAGER | ADMIN |
|---|---|---|---|
| prospect.run / view | ✓ (territory) | ✓ (territories) | ✓ |
| brief.generate / view | ✓ (authorized accounts) | ✓ | ✓ |
| visit.create / view.own | ✓ | ✓ | ✓ |
| visit.view.team | — | ✓ | ✓ |
| mapping.review / confirm | — | ✓ | ✓ |
| verification.review | own | ✓ | ✓ |
| account.assign | — | ✓ | ✓ |
| user.manage | — | — | ✓ |
| audit.view | — | — | ✓ |
| admin.settings | — | — | ✓ |

**DNC:** no role may force-include DNC accounts. ADMIN cannot bypass.

## Audit requirements

Append-only `AuditEvent` for: role/status changes, assignments, mapping decisions, visit creates, brief regen, user admin actions. No secret storage. No normal page-view spam.

## Unresolved identity-provider dependencies

| ID | Dependency |
|---|---|
| U10 | Enterprise IdP (OIDC/SAML) tenant + client |
| U11 | Official employee directory / email domain policy |
| U12 | SSO group → role mapping source of truth |

Phase 6: Auth.js with local credentials provider; interface ready for future OIDC.

## Out of scope

Production deploy · real CRM vendor · drive-time · autonomous outreach · email/SMS · background agents · autonomous CRM writes.
