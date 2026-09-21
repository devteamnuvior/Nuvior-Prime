# Enrichment — Phase 3

Public website enrichment for discovered prospects. Optional, budgeted, evidence-backed.

## Architecture

```
Discovered place (website URL from Places or mock fixture)
  → EnrichmentProvider.enrich()
  → same-domain page selection (home, about, services, contact, booking, shop)
  → fetch with timeout / size / request budget + WebsitePageCache
  → deterministic extractors (no LLM)
  → evidence records
  → aggregateEvidence (conflicts → CONFLICT, verify)
  → qualification signals (explicit only)
  → verification queue + brief inputs
```

Enrichment **never** writes into `AccountInternalStatus` (CRM).

## Providers

| Provider | When |
|---|---|
| `FixtureEnrichmentProvider` | `PLACES_PROVIDER=mock` or `ENRICHMENT_USE_FIXTURES=true` |
| `WebsiteEnrichmentProvider` | Live HTTP when Google Places mode (real websites) |

## Supported extracted fields

Contact: general email, booking URL, Instagram, LinkedIn, TikTok  
People: name + credentials exactly as displayed (MD/NP/RN/RPN/ND), roles  
Clinical: injectables, threads (explicit only), PRP, peels, microneedling, devices  
Competitive: skincare / filler / toxin / thread brands, Mesoestetic mention (signal only)  
Commercial: years in business, multi-location / hiring language (often AMBIGUOUS)

## Evidence states

| State | Meaning |
|---|---|
| `VERIFIED_SOURCE` | Explicit match with supporting snippet |
| `DERIVED` | Aggregated from keywords (e.g. service menu roll-up) |
| `AMBIGUOUS` | Weak language (e.g. “lift” without thread terms) |
| `UNKNOWN` | Missing |
| `MANUAL_VERIFY` | Needs human check |
| `CONFLICT` | Multiple incompatible source values |

## Qualification inputs enrichment may affect

Documented in `docs/PHASE3_AUDIT.md`: credentials (explicit), `advertisesThreadLifting`, injectables/threads/skincare strings.  
**Never** sets `formerMesoesteticCustomer` from website. Mesoestetic never lead product.

## Environment

| Variable | Default |
|---|---|
| `ENRICHMENT_ENABLED` | `true` |
| `ENRICHMENT_MAX_ACCOUNTS` | `5` |
| `ENRICHMENT_MAX_PAGES_PER_ACCOUNT` | `4` |
| `ENRICHMENT_MAX_REQUESTS` | `30` |
| `ENRICHMENT_TIMEOUT_MS` | `8000` |
| `ENRICHMENT_MAX_BYTES` | `500000` |
| `ENRICHMENT_CACHE_TTL_SECONDS` | `86400` |
| `ENRICHMENT_FORCE_REFRESH` | `false` |
| `ENRICHMENT_USE_FIXTURES` | empty (auto with mock Places) |

## Local run

```bash
ENRICHMENT_ENABLED=true ENRICHMENT_MAX_ACCOUNTS=5 npm run validate:toronto
ENRICHMENT_ENABLED=false npm run dev   # discovery only
```

Force refresh cache: `ENRICHMENT_FORCE_REFRESH=true`

## Compliance

- No login walls, patient portals, form posts, or PHI
- Same-domain preference; capped pages
- Failed fetch does not drop the Places prospect
- Unknown stays unknown
