# CRM real adapter (Phase 7)

**Status:** Read-only import path live. No vendor REST API invented.

## Selected source

**Authoritative for Phase 7:** structured multi-file **import** (`CRM_PROVIDER=import` or `database`) into staging + `CanonicalCrmAccount` mirror.

| Mode | Behavior |
|---|---|
| `mock` | In-memory fixtures (local/dev/tests) |
| `unavailable` | Empty / fail-closed |
| `import` / `database` | Read `CanonicalCrmAccount` populated by `npm run crm:import` |
| `api` | Reserved — **unavailable** until a real NUVIOR API contract is registered (no invented endpoints) |

Unknown `CRM_PROVIDER` values **do not** silently fall back to mock (unless `CRM_ALLOW_MOCK_FALLBACK=true` in development).

## Architecture

```
CSV/JSON exports
  → parse + validate
  → CrmSourceRecord (staging)
  → normalize (adapter DTOs)
  → merge by SOURCE_PRECEDENCE
  → CanonicalCrmAccount
  → ImportCrmProvider implements CrmProvider
  → domain (match / DNC / qualify / visit list)
```

Vendor-specific shapes never leave `src/providers/crm/import/`.

## Read-only

Allowed: fetch/normalize/list/match.  
Forbidden: CRM writes, DNC updates, ownership changes, outreach, activity creation.

## Ops

```bash
npm run crm:import -- --dir fixtures/crm --dry-run
npm run crm:import -- --dir fixtures/crm
npm run crm:backfill -- --dry-run
npm run validate:crm
```

See `CRM_IMPORT.md`, `CRM_DATA_MAPPING.md`, `CRM_RUNBOOK.md`.
