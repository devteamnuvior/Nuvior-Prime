# Account matching

Deterministic public ↔ CRM identity. Uncertain matches are **not** auto-merged.

## Hierarchy

1. Verified persistent `CrmAccountMapping` (by Place ID)
2. Exact Google Place ID on CRM row
3. Normalized business name + postal code
4. Normalized address
5. Phone
6. Email / website domain
7. Controlled fuzzy name (fallback only)

## States

| State | Meaning |
|---|---|
| `EXACT` | Verified mapping or Place ID (or near-perfect deterministic) |
| `HIGH_CONFIDENCE` | Above auto threshold, non-fuzzy |
| `POSSIBLE` | Needs manual verify — no overlay applied |
| `NO_MATCH` | New prospect / unmapped |
| `CONFLICT` | Multiple candidates — no overlay |
| `MANUAL_VERIFY` | Reserved for forced review |
| `CRM_UNAVAILABLE` | Provider down |

## Thresholds

- `CRM_MATCH_AUTO_THRESHOLD` (default `0.9`) — auto-apply EXACT/HIGH_CONFIDENCE only when method ≠ `fuzzy_name`
- `CRM_MATCH_POSSIBLE_THRESHOLD` (default `0.6`) — surface POSSIBLE

## Persistence

`CrmAccountMapping`: crmExternalId, placeId, normalized name/address, method, confidence, verified, rejected, timestamps.

- Confirmed mapping wins over future fuzzy matching.
- Rejected pairs skip auto re-apply for that placeId + crm id.

## UI

Dev matching queue for POSSIBLE/CONFLICT — confirm / reject / leave unresolved (no auth in Phase 4).
