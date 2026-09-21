# Product Gap Intelligence — Stage A Audit

**Status:** Stage A complete — audit + proposed architecture only.  
**Date:** 2026-09-01  
**Scope:** Review existing product intelligence systems before implementing  
**Odoo Product Catalog → Clinic Research → Product Gap Analysis → Evidence-Grounded Recommendation**.

> **Rule for this phase:** No working behavior was modified. This document is the prerequisite for Stages B–F.

---

## Executive summary

NUVIOR Prime today has a **mature deterministic qualification stack** (fit score, single lead product, scope of practice, DNC, Mesoestetic protection) and a **shallow website enrichment pipeline** (regex extractors, field-level evidence). It does **not** have:

- Odoo or any live product-catalog integration
- A structured clinic capability profile
- Per-product opportunity scoring or gap analysis
- Claude or any research-oriented AI provider
- Persistence for research runs or gap results

The proposed capability is **not a generic Fit Score extension**. It is a parallel product-intelligence layer that answers: *what does this clinic appear to offer, what NUVIOR product fills the strongest verified gap, and why — with evidence?*

| Layer | Today | Target |
| --- | --- | --- |
| Product catalog | Hardcoded TS + DB seed (unused at runtime) | Odoo → canonical `NuviorProduct` |
| Clinic inventory | Loose enrichment strings/booleans | `ClinicCapabilityProfile` with evidence |
| Recommendation | Single `recommendedLeadProduct` from qualification | Deterministic `Primary Recommendation` from gap engine |
| AI role | OpenAI narrative polish on locked facts | Claude structured extraction + explanation only |
| Account fit | Fit 1–5 rubric for route priority | Unchanged; separate from product opportunity |

---

## 1. Product models

### Current state

| File | Role |
| --- | --- |
| `src/domain/products.ts` | Runtime source of truth — `PRODUCTS[]`, `KEYWORD_BANK[]` |
| `src/domain/terminology.ts` | `LeadProductCode`, `ALLOWED_LEAD_PRODUCTS`, labels |
| `prisma/schema.prisma` | `ProductDefinition`, `KeywordBankEntry` |
| `prisma/seed.ts` | Seeds DB from TS constants |

**`ProductSeed` fields today:**

```
code, displayName, isActivePortfolio, mayRecommendAsLead,
requiresInjectionScope, notes
```

**Portfolio (5 codes):**

| Code | Active portfolio | May recommend as lead |
| --- | --- | --- |
| APTOS | yes | yes |
| DERMACEUTIC | yes | yes |
| FIDIA_HY_TISSUE_PRP | yes | yes |
| GESKE | yes | yes |
| MESOESTETIC | **no** | **no** |

Certification lead products (`APTOS_3_LEVEL_CERTIFICATION`, `APTOS_4_LEVEL_CERTIFICATION`) exist in the qualification enum but **not** in `ProductDefinition`.

**Runtime behavior:** `prisma.productDefinition` is never queried in `src/`. Products are read from TypeScript constants only.

**Competitor/brand lists:** Hardcoded in `src/domain/enrichment/extractors.ts` (`SKINCARE_BRANDS`, `FILLER_TOXIN_BRANDS`, `THREAD_BRANDS`, `DEVICE_NAMES`) — not catalog-driven.

### Gap vs target architecture

| Target | Gap |
| --- | --- |
| `NuviorProduct` canonical model with Odoo ID, SKU, capability tags, positioning metadata | Family-level codes only; no SKU; no Odoo sync |
| Odoo as authoritative sellable catalog | Entirely absent |
| Capability taxonomy | Implicit in keyword bank + extractors; not a first-class domain config |
| Product availability drives recommendations | `isActivePortfolio` / `mayRecommendAsLead` in TS only |

### Proposed direction (Stage B)

Introduce `ProductCatalogProvider` (`mock` | `odoo`) returning canonical `NuviorProduct[]`. Deprecate runtime reads from `PRODUCTS[]` over time; keep TS seeds as mock fallback until Odoo adapter is live.

---

## 2. Qualification engine

### Current state

| File | Role |
| --- | --- |
| `src/domain/qualification.ts` | `qualifyAccount()` — fit score + single lead product |
| `src/domain/scopeOfPractice.ts` | Provincial injection eligibility |
| `src/domain/taxonomy.ts` | §03 category taxonomy |
| `src/domain/visitList.ts` | Applies qualification to visit list entries |

**Input (`QualificationInput`):** taxonomy, credentials, CRM flags (`formerMesoesteticCustomer`, `doNotContact`, Aptos cert), flat clinical signal strings (`injectablesOffered`, `threadsOffered`, `skincareLines`).

**Output (`QualificationResult`):**

```
excluded, exclusionReason, fitScore (1–5),
recommendedLeadProduct, recommendedLeadProductLabel,
certificationPathwayFit, openingAngle,
scopeBlockedProducts, scopeNotes
```

**Lead product decision (`chooseLeadProduct`):**

1. Former Mesoestetic + skincare allowed → **Dermaceutic**
2. Threads / injectable segment → Aptos or certification variants (scope-gated)
3. PRP / hair / segment 2 → Fidia (scope-gated)
4. Peels / skincare segments → Dermaceutic
5. Retail segments → GESKE
6. Default → Dermaceutic

**Fit score (`scoreFit`):** Base 3; +segment, +physician/NP, +threads, +premium, +former Meso; cap when injectables blocked. Documented as engineering rubric A2 in `IMPLEMENTATION_PLAN.md`.

### Gap vs target architecture

| Target | Gap |
| --- | --- |
| `ProductGapAnalysis` comparing clinic profile vs catalog | Single lead product only |
| Per-product opportunity scores | Account-level fit only |
| `NOT_FOUND` vs `CONFIRMED_ABSENT` inventory states | Flat strings; no inventory state machine |
| Claude in analysis path | Qualification is 100% deterministic (correct — must stay authoritative) |

### Boundary rule (preserve)

**Account Fit** (visit list, route priority) remains `qualifyAccount().fitScore`.  
**Product Opportunity** (what to lead with at this clinic) becomes a **separate** deterministic output from the gap engine. They must not be conflated.

---

## 3. Lead-product rules

### Hard rules already enforced

| Rule | Where enforced |
| --- | --- |
| Mesoestetic never a lead product | `products.ts`, `qualification.ts` (throws if Meso selected), `brief.ts`, `llm/safety.ts`, `llm/validateSynthesis.ts` |
| Former Meso → Dermaceutic retention | `chooseLeadProduct()`, brief override, LLM validation |
| Website Meso mention ≠ former customer | `enrichment/qualificationSignals.ts` — CRM-only for `formerMesoesteticCustomer` |
| No future Meso supply promises | Brief `doNotSay`, LLM safety scan |
| Single lead product per visit | Spec §06/§09, qualification, brief UI |
| Provincial scope for Aptos / Fidia | `scopeOfPractice.ts` → certification fallback |
| Meso discovery queries are signals only | `searchQueries.ts` — `mesoesteticDiscoveryOnly` |

### Gap vs target architecture

- No product-level rules (e.g. competitor thread brand detected → Aptos gap score)
- `historicalProductInterest` (CRM) stored but **not used** in lead selection
- Import `productFamilies[]` used only to derive former-Meso flag — no SKU-level ownership

### Carry forward

Gap recommendations must respect the same guards: inactive products, Mesoestetic, scope, DNC, CRM truth.

---

## 4. Evidence model

### Current state

| File | Role |
| --- | --- |
| `src/domain/enrichment/types.ts` | `EvidenceRecord`, `EnrichmentFacts`, `ResolvedField` |
| `src/domain/enrichment/aggregateEvidence.ts` | Multi-source resolution, conflict handling |
| `src/domain/enrichment/extractors.ts` | Regex/keyword extraction from HTML |
| `src/domain/crm/ownership.ts` | Field ownership (crm / places / website / derived) |
| `prisma/schema.prisma` | `FieldEvidence` table |

**`EvidenceRecord`:**

```
fieldPath, value, sourceType, sourceUrl, sourceTitle, snippet,
retrievedAt, confidence (high|medium|low),
verificationState (VERIFIED_SOURCE|DERIVED|AMBIGUOUS|UNKNOWN|MANUAL_VERIFY|CONFLICT)
```

**Aggregation:** Best record by verification-state rank; conflicts → `CONFLICT, verify: val1 | val2`.

**LLM usage:** Evidence snippets passed as read-only context via `lockedFacts.ts` → `SynthesisContext.evidence`.

### Gap vs target architecture

| Target | Gap |
| --- | --- |
| Every capability item carries evidence | Field-centric (contact, services, brands) — not capability-centric |
| Inventory states: CONFIRMED_PRESENT / CONFIRMED_ABSENT / NOT_FOUND / AMBIGUOUS / UNKNOWN | Only verification states on fields |
| Research-run provenance (model, prompt version, sources consulted) | Not modeled |
| Gap-centric evidence ("thread lifting not found on reviewed pages") | Not modeled |

### Reuse

The existing `EvidenceRecord` pattern extends naturally to `ClinicCapabilityProfile` items. Field ownership rules (`ownership.ts`) must apply to AI-extracted facts the same way they apply to website extraction.

---

## 5. Website enrichment / crawl

### Current state

| File | Role |
| --- | --- |
| `src/providers/enrichment/websiteEnrichmentProvider.ts` | Main provider |
| `src/domain/enrichment/pageSelection.ts` | Same-domain page picker |
| `src/providers/enrichment/fetchPage.ts` | HTTP fetch + `WebsitePageCache` |
| `src/domain/enrichment/qualificationSignals.ts` | Enrichment → qualification bridge |
| `src/lib/enrichmentConfig.ts` | Budget / env limits |
| `docs/PHASE3_AUDIT.md`, `docs/ENRICHMENT.md` | Design docs |

**Pipeline:**

```
Homepage → selectPagesToFetch (about/services/contact/booking/shop)
→ htmlToText → regex extractors → aggregateEvidence → EnrichmentResult
```

**Default limits:** 5 accounts/run, 4 pages/account, 30 total requests, 8s timeout, 500KB/page, 24h cache.

**Extracted signals (`EnrichmentFacts`):** emails, booking, social, service summaries, injectables/threads/PRP/peels flags, brand lists, `mesoesteticMentioned`, `people[]` with credentials.

**Explicit non-goals:** No full-site crawl, no login walls, no LLM fact generation.

### Gap vs target architecture

| Target | Gap |
| --- | --- |
| Structured `ClinicCapabilityProfile` from clinic website | Flat strings/booleans |
| Claude structured extraction | Regex-only |
| On-demand "Research clinic" workflow | Enrichment runs during prospect build only |
| Research status (Not researched / Researching / Stale / Failed) | Not tracked |

### Reuse

Existing crawl limits, `WebsitePageCache`, page selection, and fetch safety should be the **input layer** for Claude research — not replaced. Research adds structured synthesis on top of cached page text.

---

## 6. CRM layer

### Current state

| File | Role |
| --- | --- |
| `src/providers/crm/types.ts` | `CrmInternalAccount`, `CrmProvider` |
| `src/providers/crm/import/*` | CSV/JSON import pipeline |
| `src/domain/crm/matching.ts` | Public ↔ CRM identity match |
| `src/domain/crm/dnc.ts` | DNC enforcement |
| `src/domain/crm/revisit.ts` | Revisit merge |
| `prisma/schema.prisma` | `CanonicalCrmAccount`, `CrmSourceRecord`, `CrmAccountMapping` |

**Modes:** `mock` | `import` | `database` | `api` (stub) | `unavailable`

**Product-related CRM fields:**

- `lastOrderDate` → active/dormant/never
- `formerMesoesteticCustomer`, `mesoesteticRetentionFlag`
- `historicalProductInterest` — display only
- Import `productFamilies[]` — derives former-Meso only

**No:** SKU-level order history, live Odoo sync, product ownership matrix.

### Gap vs target architecture

| Target | Gap |
| --- | --- |
| RETENTION_GAP / CROSS_SELL from CRM relationship | CRM flags feed qualification only |
| "Products purchased vs detected on site" matrix | Not computed |
| Odoo order history | Not integrated |

### Carry forward

CRM DNC, former-Meso, cert level, and last-order status remain authoritative. Gap engine reads CRM as input; never overrides CRM truth.

---

## 7. LLM / AI provider architecture

### Current state

| File | Role |
| --- | --- |
| `src/providers/index.ts` | `getLlmProvider()` |
| `src/providers/llm/types.ts` | `LlmProvider` interface |
| `src/providers/llm/openaiLlmProvider.ts` | OpenAI Chat Completions (JSON mode) |
| `src/providers/llm/mockLlmProvider.ts` | Deterministic mock |
| `src/domain/llm/synthesize.ts` | Cache, validate, merge |
| `src/domain/llm/lockedFacts.ts` | Immutable facts for LLM |
| `src/domain/llm/safety.ts`, `validateSynthesis.ts` | Post-generation guards |
| `docs/LLM_SYNTHESIS.md` | Authority boundaries |

**Providers:** `none` (default) | `mock` | `openai`

**Task types:** `brief_narrative`, `account_summary`, `structure_visit_notes`

**Claude / Anthropic:** Zero references in codebase.

**Authority boundary (non-negotiable):**

LLM must never own: DNC, CRM status, certification, taxonomy, **fit score**, **lead product**, revisit eligibility, identity matching.

### Gap vs target architecture

| Target | Gap |
| --- | --- |
| `AI_RESEARCH_PROVIDER=claude` for structured clinic extraction | No research provider |
| Schema-validated `ClinicCapabilityProfile` output | No research schemas |
| Claude explains deterministic recommendation (cannot override) | LLM only polishes brief narrative |
| Prompt injection defenses for untrusted clinic HTML | Partial (htmlToText); no research-specific hardening |

### Proposed direction (Stage C)

Add `ResearchProvider` (or extend provider factory) parallel to `LlmProvider`:

```
ResearchProvider.completeClinicExtraction(input) → ClinicCapabilityExtraction (Zod-validated)
```

Claude receives structured page text + capability taxonomy enum — returns extraction only. Domain computes gaps and scores.

---

## 8. Fit Score implementation

### Current state

| File | Role |
| --- | --- |
| `src/domain/qualification.ts` | `scoreFit()`, `clampScore()` |
| `src/domain/visitList.ts` | `minFitScore` filter |
| `src/domain/routing/optimize.ts` | Fit as route utility weight |
| `src/domain/planning/opportunity.ts` | Fit histogram in map UI |

**Rubric:** Documented in `IMPLEMENTATION_PLAN.md` §5 / assumption A2.

**Stored on:** `VisitListItem.fitScore`, `AccountQualification.fitScore`, passed to brief/LLM as locked fact.

### Gap vs target architecture

Fit Score answers: *"How valuable is this account to visit?"* (route priority).

Product Opportunity answers: *"What should we lead with at this account?"* (recommendation).

**Do not replace Fit Score with product opportunity.** Retain both; UI and brief integrate product opportunity separately.

---

## 9. Pre-visit brief

### Current state

| File | Role |
| --- | --- |
| `src/domain/brief.ts` | `generatePreVisitBrief()`, `PreVisitBriefPayload` |
| `src/components/PreVisitBriefView.tsx` | UI |
| `src/lib/prospecting.ts` | Template → optional LLM merge |
| `prisma/schema.prisma` | `PreVisitBrief` (JSON payload) |

**Payload includes:** Snapshot, **one lead product**, second product (seasonal), opening lines, questions, on-site signals, objections, the ask, leave-behind, do-not-say, seasonal context, thin-input warnings, optional `llmMeta`.

**Flow:**

1. Always generate template from locked qualification + enrichment signals
2. If LLM enabled → synthesize narrative → validate → merge (lead product re-locked)
3. On failure → `generator: "llm_fallback"`

### Gap vs target architecture

| Target brief section | Today |
| --- | --- |
| What they appear to use (evidence-backed) | Partial — enrichment strings in template context only |
| Product gap (strongest) | Not present |
| Lead product from gap engine | From qualification, not gap analysis |
| Verification question for NOT_FOUND gaps | Generic questions, not gap-specific |
| Opening angle from selected opportunity | From qualification `openingAngle` |

### Proposed integration (Stage F)

Brief receives **locked** primary recommendation from gap engine (same pattern as lead product today). Claude may explain; cannot change product ID or score.

---

## 10. Odoo-related code

**Result: none.**

- Zero Odoo references in `src/`, `prisma/`, or `docs/`
- CRM path is generic import/API-stub (`PHASE7_AUDIT.md`)
- `ProductDefinition` table could hold synced catalog but is unused at runtime

**Implication:** Odoo product catalog, availability, and metadata sync are entirely greenfield (Stage B).

---

## 11. Database / schema gaps

### Existing tables (relevant)

| Table | Used for product intelligence? |
| --- | --- |
| `ProductDefinition` | Seed only — not read at runtime |
| `KeywordBankEntry` | Seed only |
| `ProvinceScopeRule` | Seed only (logic in TS) |
| `FieldEvidence` | Partial — enrichment snapshots |
| `WebsitePageCache` | Crawl cache |
| `LlmResponseCache` | LLM narrative cache |
| `AccountQualification` | Fit + lead product persistence |
| `PreVisitBrief` | Brief JSON persistence |
| `CanonicalCrmAccount` | CRM mirror incl. order/Meso flags |

### Missing tables (proposed — Stages B–E)

| Table / concept | Purpose |
| --- | --- |
| `NuviorProduct` (or extend `ProductDefinition`) | Canonical catalog from Odoo |
| `ProductCapabilityTag` | Taxonomy mapping |
| `ClinicResearchRun` | Research status, model/prompt version, timestamps |
| `ClinicCapabilityProfile` | Structured inventory snapshot per account |
| `CapabilityEvidence` | Evidence refs linked to profile items |
| `ProductGapAnalysis` | Gap engine output per account |
| `ClinicProductOpportunity` | Per-product scores + primary flag |
| `ProductComparisonKnowledgeBase` | Approved competitor comparisons (future) |
| `ProductCatalogSyncState` | Odoo freshness / cache metadata |

---

## 12. Hard business rules — carry forward checklist

Any product gap feature **must preserve**:

1. Mesoestetic never recommended as primary or secondary opportunity
2. Former Mesoestetic → Dermaceutic-led conversation
3. Website Meso mention does not set former-customer flag
4. CRM DNC always wins
5. Scope of practice blocks product recommendations where illegal
6. Claude cannot invent clinic services, credentials, or competitor quality claims
7. Claude cannot choose/override final product or score
8. Inactive/unavailable Odoo products cannot be recommended
9. No evidence = not a confirmed fact
10. `NOT_FOUND` ≠ `CONFIRMED_ABSENT` for website absence
11. Competitor disparagement requires approved comparison dataset
12. LLM/Claude never receives API keys, Odoo credentials, or unrelated CRM secrets
13. Odoo integration is read-only in this phase
14. Single primary recommendation in rep-facing UI

---

## 13. Proposed architecture (Stages B–F)

### Data flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Odoo (read) │ ──► │ ProductCatalog   │ ──► │ NuviorProduct[]     │
│             │     │ Provider         │     │ (canonical)         │
└─────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                        │
┌─────────────┐     ┌──────────────────┐               │
│ Clinic      │ ──► │ Website cache +  │ ──► Claude    │
│ website     │     │ page selection   │     extraction│
└─────────────┘     └──────────────────┘               │
                                                        ▼
                                             ┌─────────────────────┐
                                             │ ClinicCapability    │
                                             │ Profile (+ evidence)│
                                             └──────────┬──────────┘
                                                        │
                        ┌───────────────────────────────┤
                        │                               │
                        ▼                               ▼
               ┌────────────────┐            ┌──────────────────┐
               │ CRM flags      │            │ Product Gap      │
               │ (DNC, Meso,    │ ─────────► │ Engine           │
               │  cert, orders) │            │ (deterministic)  │
               └────────────────┘            └────────┬─────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────────┐
                                           │ ClinicProduct        │
                                           │ Opportunity[]        │
                                           │ + Primary (one)      │
                                           └──────────┬───────────┘
                                                      │
                        ┌─────────────────────────────┼─────────────────┐
                        ▼                             ▼                 ▼
               ┌────────────────┐          ┌──────────────┐   ┌──────────────┐
               │ Pre-visit brief│          │ Clinic drawer│   │ Claude       │
               │ (locked primary)│          │ product intel│   │ explanation  │
               └────────────────┘          └──────────────┘   │ (optional)   │
                                                              └──────────────┘

Account Fit (qualification.fitScore) ──► route priority (unchanged, parallel)
```

### Canonical models (sketch)

#### `NuviorProduct`

```
id, odooProductId, sku, name, productFamily, brand,
active, sellable, availability,
applicableSegments[], relevantServices[], capabilityTags[],
practitionerRequirements[], provinceRestrictions[],
approvedPositioning, trainingRequired, certificationPathway,
commercialPriority?, updatedAt
```

Source: Odoo adapter → canonical. Mock provider reads from extended seed/fixtures.

#### `ClinicCapabilityProfile`

```
accountId, researchedAt, researchStatus, modelVersion,
capabilities[]: {
  type,           // service | brand | device | practitioner | focus_area | ...
  value,
  inventoryState, // CONFIRMED_PRESENT | CONFIRMED_ABSENT | NOT_FOUND | AMBIGUOUS | UNKNOWN
  evidence: EvidenceRecord[],
  confidence      // HIGH | MEDIUM | LOW
},
ambiguityFlags[], unknowns[], sourcePages[]
```

#### `ProductGapAnalysis`

```
accountId, analyzedAt, catalogVersion,
gaps[]: {
  gapType,        // CAPABILITY_GAP | PRODUCT_LINE_GAP | UPGRADE_OPPORTUNITY | ...
  capabilityTag,
  inventoryState,
  evidenceSummary,
  relatedNuviorProductIds[]
},
opportunities[]: ClinicProductOpportunity,
primaryRecommendationId
```

#### `ClinicProductOpportunity`

```
nuviorProductId, productName, opportunityType, opportunityScore,
confidence, evidence[], capabilityGap,
whyRelevant, whatClinicAlreadyHas[], whatWasNotFound[],
scopeEligible, crmRelationship, recommendedOpeningAngle,
verificationQuestions[], isPrimary
```

### Gap taxonomy

| Type | Meaning |
| --- | --- |
| `CAPABILITY_GAP` | Adjacent services present; complementary capability not found |
| `PRODUCT_LINE_GAP` | Treatment category present; no comparable brand detected |
| `UPGRADE_OPPORTUNITY` | Competitor in category; requires approved comparison data |
| `TRAINING_GAP` | Could offer product; certification missing |
| `RETENTION_GAP` | CRM historical relationship creates opportunity |
| `CROSS_SELL_OPPORTUNITY` | Existing NUVIOR relationship + verified adjacent need |
| `NO_CLEAR_GAP` | No strong recommendation — valid outcome |

### Inventory states

| State | Meaning |
| --- | --- |
| `CONFIRMED_PRESENT` | Explicit evidence on reviewed sources |
| `CONFIRMED_ABSENT` | Explicit denial or incompatible statement (rare from websites) |
| `NOT_FOUND` | Reviewed sources; capability not detected (**default for absence**) |
| `AMBIGUOUS` | Conflicting or weak signals |
| `UNKNOWN` | Insufficient sources to assess |

### Opportunity scoring (deterministic — Stage E)

Claude extracts evidence. Application scores.

**Example factors (weights TBD in `PRODUCT_OPPORTUNITY_SCORING.md`):**

- Verified need strength
- Service adjacency to product capability tags
- Segment / practitioner eligibility
- Capability gap severity (NOT_FOUND vs AMBIGUOUS)
- Competitor-category presence (not quality judgment)
- CRM relationship (retention / cross-sell)
- Certification status
- Product availability (Odoo active/sellable)
- Evidence confidence
- Internal commercial priority (if configured)

**Claude output schema must NOT include:** final score, primary product ID.

### Competitor comparison safeguards

- No general-model claims about competitor quality
- `ProductComparisonKnowledgeBase` (future) holds approved factual comparisons only
- Allowed: capability/workflow positioning ("no Dermaceutic line detected; clinic emphasizes pigmentation")
- Not allowed: "their peel is low quality"

### Research workflow (on-demand — Stage C/D)

```
User selects clinic → "Research clinic"
  → reuse WebsitePageCache or fetch (existing limits)
  → Claude structured extraction → ClinicCapabilityProfile
  → Gap engine vs NuviorProductCatalog
  → Persist analysis + status
  → UI: Best opportunity + "View other opportunities"
```

**Research status:** `NOT_RESEARCHED` | `RESEARCHING` | `RESEARCHED` | `NEEDS_VERIFICATION` | `STALE` | `FAILED`

**Invalidation triggers:** Odoo catalog change, clinic evidence change, CRM state change, approved metadata change, explicit user refresh.

### Caching strategy

| Cache | Key | Invalidation |
| --- | --- | --- |
| `WebsitePageCache` | URL + content hash | TTL (existing) |
| `ClinicCapabilityProfile` | accountId + page hash + model version | Evidence change |
| `ProductGapAnalysis` | accountId + profile version + catalog version | Profile or catalog change |
| Claude extraction | prompt hash + input hash | Same as profile |
| Odoo catalog | sync timestamp + etag | Odoo webhook / scheduled sync |

Store `modelId`, `promptVersion`, `catalogSyncedAt` on every research run.

---

## 14. Integration points in existing pipeline

**Natural insertion (no rewrite):**

```
Discovery
  → Enrichment (existing crawl)
  → [NEW: on-demand Research → ClinicCapabilityProfile]
  → CRM merge (existing)
  → Qualification (unchanged — Account Fit + legacy lead product for visit list)
  → [NEW: ProductGapAnalysis (parallel)]
  → Brief (add gap sections; primary from gap engine when researched)
```

**Reuse without rewrite:**

- `EvidenceRecord` + aggregation + conflict rules
- `ownership.ts` field authority
- Provider factory pattern (`providers/index.ts`)
- LLM locked-facts + Zod validation pattern
- CRM import for order/product family data
- `WebsitePageCache` + enrichment limits

**Do not bypass:**

- DNC, Meso rules, scope checks on every opportunity candidate

---

## 15. Evaluation fixtures (Stage E — planned)

Deterministic test clinics:

| Fixture | Tests |
| --- | --- |
| Injectable clinic, no threads detected | Aptos primary; NOT_FOUND wording |
| Competitor skincare clinic | Dermaceutic opportunity; no disparagement |
| PRP sports medicine clinic | Fidia adjacency |
| Skincare-only aesthetician | Scope / segment gates |
| Existing Aptos customer | No false CAPABILITY_GAP |
| Former Mesoestetic customer | Dermaceutic retention; Meso blocked |
| Sparse website | UNKNOWN / low confidence; verification questions |
| Conflicting evidence | AMBIGUOUS; no forced primary |
| No clear gap | `NO_CLEAR_GAP` allowed |

---

## 16. Implementation stages

| Stage | Deliverable | Status |
| --- | --- | --- |
| **A** | This audit + proposed architecture | **Complete** |
| **B** | `ProductCatalogProvider` + `NuviorProduct` + mock; `docs/ODOO_PRODUCT_CATALOG.md` | Not started |
| **C** | `ClinicCapabilityProfile` + Claude extraction provider + schemas; `docs/CLAUDE_RESEARCH.md`, `docs/CLINIC_PRODUCT_INTELLIGENCE.md` | Not started |
| **D** | Deterministic `ProductGapAnalysis` engine + gap taxonomy; `docs/PRODUCT_GAP_ENGINE.md` | Not started |
| **E** | Opportunity scoring + evaluation fixtures; `docs/PRODUCT_OPPORTUNITY_SCORING.md` | Not started |
| **F** | Clinic UI product-intelligence section + pre-visit brief integration | Not started |

**Documentation to create in later stages:**

- `docs/ODOO_PRODUCT_CATALOG.md`
- `docs/CLINIC_PRODUCT_INTELLIGENCE.md`
- `docs/PRODUCT_GAP_ENGINE.md`
- `docs/CLAUDE_RESEARCH.md`
- `docs/PRODUCT_OPPORTUNITY_SCORING.md`

Updates to `ARCHITECTURE.md`, `DATA_MODEL.md`, `IMPLEMENTATION_PLAN.md`, `LLM_SYNTHESIS.md`, and pre-visit brief docs deferred to the stage that implements each area.

---

## 17. Unresolved Odoo dependencies

| Dependency | Status | Blocker for |
| --- | --- | --- |
| Odoo instance URL + credentials | Not configured | Live `PRODUCT_CATALOG_PROVIDER=odoo` |
| Odoo product model / fields mapping | Unknown | Adapter design |
| Which metadata fields exist in Odoo vs must live in NUVIOR config | Unknown | `NuviorProduct.approvedPositioning`, capability tags |
| Odoo read API choice (XML-RPC / JSON-RPC / REST) | Undecided | Provider implementation |
| Sync frequency / webhook availability | Unknown | Cache freshness strategy |
| SKU-level order history in Odoo vs CRM import only | Unknown | RETENTION_GAP / CROSS_SELL accuracy |
| Mesoestetic historical products in Odoo | Expected | Must map to non-recommendable regardless of Odoo active flag |

**Stage B can proceed with `PRODUCT_CATALOG_PROVIDER=mock`** using extended fixtures mirroring expected Odoo shape. Live Odoo adapter is a separate integration task once credentials and field mapping are confirmed.

---

## 18. File index (audit reference)

```
src/domain/products.ts              — hardcoded product + keyword seeds
src/domain/terminology.ts           — lead labels, active portfolio
src/domain/qualification.ts         — fit score + lead product engine
src/domain/scopeOfPractice.ts       — provincial injection rules
src/domain/brief.ts                 — pre-visit brief generator
src/domain/enrichment/*             — crawl, extractors, evidence, signals
src/domain/crm/*                    — DNC, matching, cert, revisit, lastOrder
src/domain/llm/*                    — synthesis, safety, schemas, prompts
src/providers/index.ts              — provider factories
src/lib/prospecting.ts              — end-to-end prospect run orchestration
prisma/schema.prisma                — data model
prisma/seed.ts                      — reference data seeding
docs/NUVIOR_PRIME_SPEC.md           — business spec §01–§09
docs/DATA_MODEL.md                  — entity documentation
docs/LLM_SYNTHESIS.md               — AI authority boundaries
docs/PHASE3_AUDIT.md                — enrichment design
docs/PHASE7_AUDIT.md                — CRM import design
docs/IMPLEMENTATION_PLAN.md         — fit rubric, phased delivery
```

---

## 19. Stage A completion checklist

- [x] Product models audited
- [x] Qualification engine audited
- [x] Lead-product / Mesoestetic rules documented
- [x] Evidence model audited
- [x] Website enrichment audited
- [x] CRM layer audited
- [x] LLM provider architecture audited
- [x] Fit Score vs Product Opportunity boundary defined
- [x] Pre-visit brief audited
- [x] Odoo absence confirmed
- [x] Proposed architecture sketched
- [x] Hard business rules inventory
- [x] Stage plan B–F outlined
- [x] Unresolved Odoo dependencies listed
- [x] No working behavior modified

**Next step:** Stage B — `ProductCatalogProvider` + canonical `NuviorProduct` model with mock provider.
