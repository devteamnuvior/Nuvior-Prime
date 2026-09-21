# CRM / internal account integration

**Phase:** 7 (read-only import)  
**Related:** `ACCOUNT_MATCHING.md`, `VISIT_HISTORY.md`, `CRM_REAL_ADAPTER.md`, `CRM_DATA_MAPPING.md`, `CRM_IMPORT.md`, `CRM_RUNBOOK.md`, `PHASE7_AUDIT.md`

## Provider

```ts
interface CrmProvider {
  name: string;
  isUnavailable(): boolean;
  getById(id): Promise<CrmInternalAccount | null>;
  searchAccounts(query): Promise<CrmInternalAccount[]>;
  listAccounts(): Promise<CrmInternalAccount[]>;
  getStatusForPlace(placeId, name): Promise<CrmInternalAccount | null>;
  getStatusByName(name): Promise<CrmInternalAccount | null>;
  getVisitHistory(id): Promise<CrmVisitHistoryItem[]>;
  getRevisitsDue(asOf, province?): Promise<CrmInternalAccount[]>;
  getAlreadyVisitedNotDue(asOf, province?): Promise<CrmInternalAccount[]>;
}
```

### Modes

| `CRM_PROVIDER` | Behavior |
|---|---|
| `mock` (default) | In-memory fixtures |
| `unavailable` | Empty / fail-closed |
| `import` / `database` | `CanonicalCrmAccount` mirror via import |
| `api` | Fail-closed — no invented vendor endpoints |

Unknown modes **do not** silently use mock (unless explicit `CRM_ALLOW_MOCK_FALLBACK` in development).

## Data ownership

| Owner | Fields |
|---|---|
| **CRM / import** | DNC, last order, academy, Aptos cert/pathway, 4-level eligibility, former Mesoestetic, visits, revisits, assigned rep, internal notes |
| **Places** | Place ID, rating/reviews, public address/phone/hours/maps |
| **Website enrichment** | Services, practitioners, brands, devices (evidence) |
| **Derived** | Taxonomy, fit, lead product, pathway recommendation, opening angle, last-order status band |

Conflicts retain both sides; never overwrite CRM with web.

## DNC

Central `evaluateDnc`. Authoritative DNC comes from the **dnc** import source only.

- Matched `doNotContact=true` + `dncVerified` → excluded  
- Missing DNC master / `dncVerified=false` → `crmUnverified` (not assumed safe)  
- CRM unavailable → `crmUnverified`  
- Public discovery cannot bypass CRM DNC

## Certification

CRM cert level/pathway when matched. Do not recommend a lower pathway than CRM progress; do not infer completed cert from public credentials alone.

## Former Mesoestetic

CRM/import-only (explicit flag or deterministic `productFamilies` match). Retention → lead **Dermaceutic**. Never recommend Mesoestetic. Website Mesoestetic mentions stay competitive evidence only.

## Last order

Derived bands (configurable):

- `CRM_LAST_ORDER_ACTIVE_DAYS` (default 90) → `active`
- `CRM_LAST_ORDER_DORMANT_DAYS` (default 365) → `dormant`
- else `long_lapsed`; null → `never`

Does not override DNC.

## Fallback

Discovery + enrichment still run. Internal fields show unavailable/unknown. Absence of CRM ≠ safe to contact. Real-provider failure never injects mock customer data.

## Unresolved

U2 live vendor API contract · U7 enterprise DNC master wiring beyond import · U8 upstream Place↔CRM map · U10–U12 IdP.
