# CRM import (Phase 7)

## Format

Directory (default `fixtures/crm` or `CRM_IMPORT_PATH`) may contain:

- `accounts.json` | `accounts.csv`
- `academy.json` | `academy.csv`
- `orders.json` | `orders.csv`
- `dnc.json` | `dnc.csv`
- `visits.json` | `visits.csv`

JSON: array of objects, or `{ "records": [ ... ] }`.

## Commands

```bash
# Dry-run — no writes
npm run crm:import -- --dir fixtures/crm --dry-run

# Apply to staging + canonical mirror
npm run crm:import -- --dir fixtures/crm

# Place-ID mapping backfill (dry-run default)
npm run crm:backfill -- --dry-run
npm run crm:backfill -- --apply
```

Dry-run reports: records read, valid/invalid, new/updated counts, preview (masked ids), parse errors. No DB writes.

## Validation rules

- Required: `crmExternalId`; accounts also require `businessName`.  
- Malformed rows rejected; import continues.  
- Missing values stay null — never invented.  
- Booleans: `Y/N`, `true/false`, `1/0`.  
- Dates: parseable ISO / Date strings → `YYYY-MM-DD`.

## Staging

`CrmSourceRecord`: source, sourceRecordId, rawHash, payloadJson (minimized), normalizedStatus, parseErrors.

## Secrets

Import files must not contain API tokens. Credentials stay in env for future API mode only.
