# CRM data mapping (Phase 7)

## Sources & precedence

| Source file | Kind | Precedence | Owns |
|---|---|---|---|
| `dnc.json` / `.csv` | `dnc` | 100 | `doNotContact`, `dncVerified` |
| `academy.json` | `academy` | 80 | academy account, cert level, pathway, 4-level staff |
| `orders.json` | `orders` | 70 | last order, product interest, former Meso (derive) |
| `visits.json` | `visits` | 60 | last visit, revisit due, visit notes |
| `accounts.json` | `accounts` | 50 | identity, address, phone, email, placeId, rep, status |

Higher precedence wins per field. Lower-authority sources never silently override DNC.

## Canonical fields

| Canonical | Source | Notes |
|---|---|---|
| `crmExternalId` | all | Required join key |
| `businessName` | accounts | Required to materialize account |
| address / phone / email / placeId / domain | accounts | Normalized; missing → null |
| `assignedRep` | accounts | App assignments not auto-overwritten |
| `hasAcademyAccount` | academy | |
| `aptosCertificationLevel` | academy | Never inferred from web |
| `aptosPathway` | academy | `NONE` / `THREE_LEVEL` / `FOUR_LEVEL` |
| `staffEligibleFor4Level` | academy | |
| `lastOrderDate` | orders | ISO date |
| `formerMesoesteticCustomer` | orders (or explicit accounts) | See derivation |
| `doNotContact` | dnc **only** | null if master missing |
| `dncVerified` | dnc **only** | false ⇒ treat as unverified contact status |
| visits | visits / accounts | |

## Former Mesoestetic derivation

1. Explicit `formerMesoesteticCustomer` on orders or accounts if present.  
2. Else if `productFamilies` contains `/mesoestetic/i` → true.  
3. Else false / not set.  
Retention context only — never a lead product.

## DNC outage / missing master

- No DNC row for account → `dncVerified=false`, `doNotContact` null → mapped to `doNotContact=false` **with** `dncVerified=false`.  
- `evaluateDnc` → `crmUnverified=true` (not excluded, not safe).  
- Provider unavailable → `CRM_UNAVAILABLE` / unverified.  
- Never assume DNC=false as proof safe to contact.

## Provenance

`CanonicalCrmAccount.sourceProvenance` stores `{ field: { source, at } }` per merged field.
