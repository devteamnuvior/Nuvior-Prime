# Odoo Product Catalog (Stage B)

**Status:** Stage B complete — provider boundary + mock catalog.  
**Not in scope yet:** Claude extraction, gap analysis, opportunity scoring, UI, live Odoo sync.

---

## Purpose

Establish the authoritative product-catalog boundary for NUVIOR Prime product intelligence.

```
Odoo (future) / Mock
  → ProductCatalogProvider
  → canonical NuviorProduct[]
  → (Stage C+) ClinicCapabilityProfile / Product Gap Engine
```

Domain and gap-engine code **must not** depend on Odoo RPC/ORM response shapes.

---

## Canonical model: `NuviorProduct`

Defined in `src/domain/products/nuviorProduct.ts`.

| Field | Purpose |
| --- | --- |
| `id` | Stable NUVIOR canonical ID |
| `externalId` | Provider ID (future Odoo `product.template` id) — nullable |
| `sku` | SKU when known — nullable |
| `name` | Display name |
| `brand` | Brand label |
| `productFamily` | `APTOS` \| `DERMACEUTIC` \| `FIDIA_HY_TISSUE_PRP` \| `GESKE` \| `MESOESTETIC` |
| `active` | Catalog active flag |
| `sellable` | Commercially sellable |
| `availabilityStatus` | `AVAILABLE` \| `LIMITED` \| `DISCONTINUED` \| `OUT_OF_STOCK` \| `UNKNOWN` |
| `capabilityTags` | Tags from closed taxonomy |
| `applicableSegments` | Taxonomy segment numbers (1–6) |
| `relevantServices` | Internal service vocabulary |
| `practitionerRequirements` | Scope hints (`INJECTION_SCOPE`, etc.) |
| `provinceRestrictions` | Province codes where restricted |
| `trainingRequired` | Certification/training SKU |
| `certificationPathway` | `THREE_LEVEL` \| `FOUR_LEVEL` \| `NONE` |
| `approvedPositioning` | Approved internal copy only — nullable |
| `commercialPriority` | Internal priority when configured — nullable |
| `recommendable` | Explicit recommendation gate (Mesoestetic = false) |
| `source` | `mock` \| `odoo` \| `cache` |
| `sourceUpdatedAt` | Last known upstream update — nullable |

**Do not invent clinical indications.** Fields without Odoo mapping stay nullable until configured.

---

## Capability taxonomy (v1.0.0)

Closed set in `src/domain/products/capabilityTaxonomy.ts`:

| Code | Label |
| --- | --- |
| `THREAD_LIFTING` | Thread lifting |
| `PROFESSIONAL_PEEL` | Professional peel |
| `PIGMENTATION_CORRECTION` | Pigmentation correction |
| `ACNE_PROTOCOL` | Acne protocol |
| `MEDICAL_GRADE_SKINCARE` | Medical-grade skincare |
| `PRP_HAIR` | PRP hair restoration |
| `PRP_REGENERATIVE` | PRP regenerative |
| `RETAIL_BEAUTY_DEVICE` | Retail beauty device |
| `TRAINING_CERTIFICATION` | Training / certification |

Future LLM/research stages must **normalize into this set** — not create dynamic capability names.

---

## Provider interface

`ProductCatalogProvider` (`src/providers/productCatalog/types.ts`):

| Method | Purpose |
| --- | --- |
| `listProducts()` | Full catalog snapshot |
| `listActiveProducts()` | `active === true` |
| `getProductById(id)` | Single product |
| `listProductFamilies()` | Family summaries |
| `getProductsByCapability(tag)` | Capability lookup |
| `getCatalogMetadata()` | Freshness + version |
| `isUnavailable()` / `getUnavailableReason()` | Fail-closed state |

Factory: `getProductCatalogProvider()` in `src/providers/productCatalog/index.ts` (server-side only).

---

## Provider modes

| `PRODUCT_CATALOG_PROVIDER` | Behavior |
| --- | --- |
| `mock` (default) | Synthetic fixtures — clearly not real Odoo/pricing |
| `odoo` | **Unavailable** until real adapter registered — no invented contract |
| `unavailable` | Explicit fail-closed |

**Odoo mode never silently falls back to mock** (mirrors CRM `api` fail-closed pattern).

Env validation: `npm run validate:product-catalog`

---

## Mock catalog

Fixtures: `src/providers/productCatalog/mockCatalogFixtures.ts`

Synthetic products cover:

| Scenario | Fixture id |
| --- | --- |
| Aptos recommendable | `nuvior-aptos-threads` |
| Dermaceutic recommendable | `nuvior-dermaceutic-professional` |
| Fidia recommendable | `nuvior-fidia-hy-tissue-prp` |
| GESKE recommendable | `nuvior-geske-retail` |
| Aptos 3/4-level certification | `nuvior-aptos-cert-3-level`, `nuvior-aptos-cert-4-level` |
| Inactive product | `nuvior-aptos-legacy-kit` |
| Non-sellable product | `nuvior-geske-wholesale-only` |
| Province restriction (QC) | `nuvior-fidia-restricted-demo` |
| Mesoestetic historical | `nuvior-mesoestetic-historical-stock` |

External IDs use `MOCK-ODOO-*` prefix. SKUs use `SYN-*` prefix.

---

## Recommendation eligibility

`isProductRecommendable(product, context)` in `src/domain/products/eligibility.ts`.

Enforces (deterministic — **not** opportunity scoring):

- `recommendable`, `active`, `sellable`, availability status
- Mesoestetic prohibition (family + flag)
- Province restrictions
- Training products require `allowTrainingProducts`
- Aptos / Fidia injection scope via existing `evaluateScopeOfPractice()`

---

## LeadProduct compatibility (Phase 1–8 preserved)

Qualification continues using `LeadProductCode` from `src/domain/terminology.ts`.

Mapping layer: `src/domain/products/leadProductCompat.ts`

| LeadProductCode | Catalog id |
| --- | --- |
| `APTOS` | `nuvior-aptos-threads` |
| `DERMACEUTIC` | `nuvior-dermaceutic-professional` |
| `FIDIA_HY_TISSUE_PRP` | `nuvior-fidia-hy-tissue-prp` |
| `GESKE` | `nuvior-geske-retail` |
| `APTOS_3_LEVEL_CERTIFICATION` | `nuvior-aptos-cert-3-level` |
| `APTOS_4_LEVEL_CERTIFICATION` | `nuvior-aptos-cert-4-level` |

**Temporary duplication:** `src/domain/products.ts` (`PRODUCTS[]`) remains for Phase 1–8 seeds/qualification. Catalog provider is the future source of truth for product intelligence. Unification deferred to a later stage.

---

## Catalog freshness / provenance

`ProductCatalogMetadata`:

| Field | Meaning |
| --- | --- |
| `fetchedAt` | When catalog was loaded into cache |
| `sourceUpdatedAt` | Upstream last update (mock fixture timestamp / future Odoo write date) |
| `catalogVersion` | SHA-256 hash prefix of product snapshot |
| `stale` / `staleReason` | Cache age or provider unavailable |
| `capabilityTaxonomyVersion` | Taxonomy version used |

`CachedProductCatalogProvider` wraps inner provider:

- TTL: `PRODUCT_CATALOG_CACHE_TTL_SECONDS` (default 3600)
- Stale threshold: `PRODUCT_CATALOG_STALE_AFTER_SECONDS` (default 86400)

Pattern: **fetch/sync once → normalize → reuse** for all clinic analyses.

---

## Odoo integration boundary (unresolved)

`OdooProductCatalogProvider` exists as a **read-only contract stub** only.

**Do not guess.** Before implementation, NUVIOR must confirm:

| Item | Status |
| --- | --- |
| Odoo version | Unknown |
| API mechanism (XML-RPC / JSON-RPC / REST) | Undecided |
| Authentication method | Undecided |
| Product model (`product.template` vs `product.product`) | Unknown |
| Field names for active/sellable | Unknown |
| SKU field | Unknown |
| Stock / availability source | Unknown |
| Category / brand mapping | Unknown |
| Custom NUVIOR metadata fields (positioning, capability tags, segments) | Unknown |
| Update timestamps | Unknown |
| Mesoestetic historical product handling in Odoo | Expected — must map to non-recommendable |

### Read-only rules (future)

- No product writes, price changes, inventory writes, sales orders, or CRM activity writes
- Credentials server-side only (`ODOO_BASE_URL`, `ODOO_API_KEY` / `ODOO_PASSWORD` — never `NEXT_PUBLIC_*`)
- Browser receives only sanitized product data required by UI

---

## Security

- Product catalog access is **server-side** via `getProductCatalogProvider()`
- No Odoo credentials or raw Odoo payloads exposed to the browser
- Mock catalog contains no real pricing or confidential data

---

## Config

```bash
PRODUCT_CATALOG_PROVIDER=mock
PRODUCT_CATALOG_CACHE_TTL_SECONDS=3600
PRODUCT_CATALOG_STALE_AFTER_SECONDS=86400
# PRODUCT_CATALOG_UNAVAILABLE=false   # mock fail-closed test

# Reserved — not used until Odoo adapter exists:
# ODOO_BASE_URL=
# ODOO_API_KEY=
# ODOO_PASSWORD=
```

---

## Tests

```bash
npm run test -- src/domain/products src/providers/productCatalog
npm run validate:product-catalog
```

---

## Stage readiness

| Stage | Depends on |
| --- | --- |
| **C** Claude extraction | Catalog + taxonomy for normalization targets |
| **D** Gap engine | `NuviorProduct[]` + capability tags + eligibility |
| **E** Opportunity scoring | Catalog metadata version for traceability |

See also: `docs/PRODUCT_GAP_AUDIT.md`
