# Product Gap Engine (Stage D)

**Status:** Complete  
**Rules version:** `PRODUCT_GAP_RULES_VERSION=1.0.0`  
**Boundary:** Candidate gaps only — no product ranking, primary recommendation, or pre-visit brief integration.

---

## Purpose

Compare:

- `ClinicCapabilityProfile` (Stage C)
- Canonical active `NuviorProduct[]` (Stage B)
- CRM + scope context (where authoritative)

→ **`ProductGapAnalysis`** via deterministic **`ProductGapEngine`**.

Claude does **not** determine gaps. The engine uses explicit adjacency rules and inventory-state semantics.

---

## Flow

```
ClinicCapabilityProfile
  + NuviorProductCatalog (active/sellable/recommendable)
  + province + credential signals + CRM context
        ↓
  analyzeProductGaps()
        ↓
  ProductGapAnalysis
        ↓
  (Stage E — opportunity scoring — not implemented)
```

Phase 1–8 qualification, Account Fit, DNC, routing, and lead-product logic are **unchanged**.

---

## Models

### ProductGapAnalysis

| Field | Description |
| --- | --- |
| clinicId | Account/clinic identifier |
| analyzedAt | ISO timestamp |
| profileVersion | Stage C sourceVersion |
| catalogVersion | Catalog provider version/hash |
| gapRulesVersion | 1.0.0 — traceable rule-set version |
| crmContextHash | Hash of CRM fields affecting gaps |
| gaps[] | Candidate ProductGap records |
| noClearGapReasons[] | When no viable gap is produced |
| verificationItems[] | Rep verification prompts |
| evidenceRefs[] | Linked profile evidence |
| hasPrimaryRecommendation | Always false in Stage D |
| hasOpportunityScore | Always false in Stage D |

### ProductGap

| Field | Description |
| --- | --- |
| id | Deterministic hash id |
| gapType | See taxonomy below |
| capability | Target CapabilityTag (when applicable) |
| relevantProductIds[] | Family-primary catalog IDs only (not every SKU) |
| clinicInventoryState | Stage C inventory state for target |
| evidenceRefIds[] | Profile evidence supporting adjacency/presence/absence |
| confidence | HIGH / MEDIUM / LOW (gap confidence — not opportunity score) |
| reasonCode | Machine-readable reason |
| explanationData | Structured inputs for Stage F wording |
| verificationRequired | true when based on NOT_FOUND / AMBIGUOUS |
| verificationQuestion | Deterministic template text |
| eligibilityState | ELIGIBLE / BLOCKED_SCOPE / BLOCKED_CATALOG / BLOCKED_DNC |
| blockingReasons[] | Why blocked when not eligible |

---

## Gap taxonomy

| Type | When emitted |
| --- | --- |
| CAPABILITY_GAP | Adjacent services confirmed; target NOT_FOUND, CONFIRMED_ABSENT, or AMBIGUOUS |
| PRODUCT_LINE_GAP | Category participation; competitor line present; no mapped NUVIOR family line |
| TRAINING_GAP | Scope-eligible account; Aptos certification missing per CRM |
| CROSS_SELL_OPPORTUNITY | Existing NUVIOR customer + eligible adjacent capability gap |
| RETENTION_GAP | formerMesoesteticCustomer (CRM) → Dermaceutic family |
| UPGRADE_OPPORTUNITY | Blocked unless APPROVED_PRODUCT_COMPARISONS KB entry exists |
| NO_CLEAR_GAP | Expressed via noClearGapReasons[] when gaps array is empty |

---

## Adjacency rules

Explicit rules in `src/domain/gap/adjacencyRules.ts` — not LLM-inferred.

| Rule ID | Target | Family | Adjacency signals |
| --- | --- | --- | --- |
| aptos-thread-from-injectables | THREAD_LIFTING | Aptos | injectables, fillers, facial aesthetics |
| dermaceutic-skincare-line | MEDICAL_GRADE_SKINCARE | Dermaceutic | peels, pigmentation, competitor skincare |
| dermaceutic-peel-adjacency | PROFESSIONAL_PEEL | Dermaceutic | pigmentation, medical skincare |
| fidia-prp-adjacency | PRP_REGENERATIVE | Fidia | PRP, hair restoration, regenerative |
| geske-retail-device | RETAIL_BEAUTY_DEVICE | GESKE | retail, spa, beauty device |

Pattern: present A + B, target C NOT_FOUND → capability gap when C is in adjacency rule.

---

## Inventory-state behavior

| State | Gap behavior |
| --- | --- |
| CONFIRMED_PRESENT | No simple missing-capability gap for same capability |
| CONFIRMED_ABSENT | Stronger capability-gap signal |
| NOT_FOUND | Potential gap + verification — not confirmed absence |
| AMBIGUOUS | Weak / verification-only gap |
| UNKNOWN | Normally no strong gap |

---

## Confidence model

- HIGH: strong adjacency + CONFIRMED_ABSENT + scope/practitioner confirmed
- MEDIUM: strong adjacency + NOT_FOUND
- LOW: ambiguous adjacency or sparse website

Separate from Stage E opportunity score.

---

## CRM, scope, catalog

- DNC: gaps may exist but BLOCKED_DNC — not an opportunity
- Former Meso: RETENTION_GAP → Dermaceutic only
- Scope: evaluateScopeOfPractice gates Aptos/Fidia capability gaps
- Catalog: isProductRecommendable() before attaching products; Mesoestetic never in relevantProductIds

---

## Caching

Prisma `ProductGapAnalysis` — cache key: profileVersion + catalogVersion + gapRulesVersion + crmContextHash.

See `src/lib/gapPersistence.ts`.

---

## Validation

```bash
npm run validate:product-gaps
```

Nine scenarios (Cases A–I) using Stage C fixtures + mock catalog.

---

## Stage E readiness

Stage D provides structured gaps, eligible family product IDs (unranked), verification items, and versioned cache keys for opportunity scoring without re-running research.
