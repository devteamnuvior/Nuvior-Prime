# CRM runbook (Phase 7)

## Local mock (default)

```bash
CRM_PROVIDER=mock
npm run dev
```

## Import mode

1. Obtain NUVIOR exports mapped to Prime import schema (`CRM_DATA_MAPPING.md`).  
2. Place files under a directory (e.g. `fixtures/crm` or secure ops path).  
3. Dry-run: `npm run crm:import -- --dir <path> --dry-run`  
4. Apply: `npm run crm:import -- --dir <path>`  
5. Set `CRM_PROVIDER=import`  
6. `npm run validate:crm`  
7. Optional: `npm run crm:backfill -- --dry-run` then `--apply` for Place ID mappings.

## Freshness

- `CRM_CACHE_TTL_SECONDS` (default 604800) → stale indicator on import provider / admin CRM page.  
- Stale data remains readable but flagged — not presented as fresh.  
- No background sync jobs in Phase 7.

## Outage

| Condition | Behavior |
|---|---|
| Empty mirror | `ImportCrmProvider.isUnavailable()` — no mock fallback |
| `CRM_PROVIDER=api` | Always unavailable until real contract |
| DB error | Unavailable reason set; discovery may continue; DNC unverified |
| Missing DNC master row | Account-level DNC unverified |

## Diagnostics

Admin: `/admin/crm` (`admin.settings`) — source mode, counts, last import, stale, ownership conflicts. No raw payloads.

## Secrets

Never commit `CRM_API_TOKEN`. Server-side only. Not logged, not audited as secret value, not sent to LLM.
