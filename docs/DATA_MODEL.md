# NUVIOR Prime — Data Model

**Source of truth:** `docs/NUVIOR_PRIME_SPEC.md` (v2.1)  
**Persistence:** PostgreSQL via Prisma  
**Status:** Phase 8

---

## 1. Design principles

1. Exact taxonomy labels from spec §03 — no renamed categories.
2. Public/web fields vs NUVIOR internal fields are separate tables/relations.
3. Researched scalar fields carry optional `FieldEvidence` (source, URL, capturedAt).
4. Unknown values use sentinel `UNKNOWN, verify` or null + `needsVerification`.
5. Never store patient information.
6. Mesoestetic is stock/history only — never a recommendable lead product enum value for ongoing pitch.
7. **Phase 2:** Google Places payloads are public evidence only; NUVIOR taxonomy is derived, not stored as a Google field.
8. **Phase 4:** CRM mappings and visit history are separate from Places/website caches; CRM truth is never overwritten by web.
9. **Phase 5:** LLM outputs are narrative overlays only; locked qualification/CRM facts are never sourced from the model.
10. **Phase 6:** Authenticated users; territory + permission gates; append-only audit for sensitive mutations.
11. **Phase 7:** CRM staging (`CrmSourceRecord`) + canonical mirror (`CanonicalCrmAccount`); import provenance; DNC verification flag.
12. **Phase 8:** `RouteCache`; visit-run route snapshots (sequence, ETA, leg times, hours feasibility); start geocode metadata.

---

## 2. Entity overview

```
ProvinceRule
TaxonomySegment ──< TaxonomyCategory
ProductDefinition
KeywordBankEntry

Account (identity + location + public profile)
  ├── AccountPublicProfile (web-derived)
  ├── AccountInternalStatus (NUVIOR CRM)
  ├── AccountPerson[]
  ├── FieldEvidence[]
  ├── AccountQualification (computed snapshot)
  └── VisitRecord[]

VisitListRun (provider + filter snapshot)
  └── VisitListItem[] ──> Account (fit/lead/CRM match snapshots)

CrmAccountMapping (public Place ID ↔ CRM external ID)
PlacesApiCache   (Phase 2 — provider response cache; public data only)
WebsitePageCache (Phase 3 — website fetch cache)
LlmResponseCache (Phase 5 — narrative synthesis cache; not business truth)
User / AccountAssignment / AuditEvent (Phase 6)
CrmSourceRecord / CanonicalCrmAccount (Phase 7 — import mirror)
RouteCache / VisitListRun route fields / VisitListItem route snapshot (Phase 8)
```

### Phase 3 evidence (`FieldEvidence` + runtime `EvidenceRecord`)

| Field | Notes |
|---|---|
| fieldPath | e.g. `injectablesOffered`, `people` |
| valueSnapshot / value | Normalized extracted value |
| sourceType | PLACES / WEBSITE / CRM / MANUAL / MOCK |
| sourceUrl, sourceTitle | Page provenance |
| snippet | Supporting text |
| verificationState | VERIFIED_SOURCE / DERIVED / AMBIGUOUS / UNKNOWN / MANUAL_VERIFY / CONFLICT |
| contentHash | Optional |
| needsVerification | Boolean |

Runtime enrichment also returns `EnrichmentResult` on each search (not only DB).

### Phase 4 CRM mapping & visits

| Model | Purpose |
|---|---|
| `CrmAccountMapping` | Verified/rejected Place ↔ CRM links |
| `VisitRecord` | Persisted visit outcomes (no PHI) |
| `VisitListRun` / `VisitListItem` | Daily list snapshots including CRM match + last-order status |

## 3. Reference / seed entities

### 3.1 `TaxonomySegment`

| Field | Type | Notes |
|---|---|---|
| id | PK | |
| number | Int 1–6 | Spec segment number |
| name | String | e.g. "Physician & NP led medical aesthetics" |
| priorityNote | String? | e.g. "highest priority" |
| subtitle | String? | Spec sub-line |

### 3.2 `TaxonomyCategory`

| Field | Type | Notes |
|---|---|---|
| id | PK | |
| segmentId | FK | |
| number | Int | Category number within segment |
| label | String | **Exact** label from spec §03 |

**Organization type** (tag on account, not taxonomy row):  
`Independent` | `Chain location` | `Chain head office` | `Hospital or academic`

### 3.3 `ProductDefinition`

| Field | Type | Notes |
|---|---|---|
| code | Unique | `APTOS`, `DERMACEUTIC`, `FIDIA_HY_TISSUE_PRP`, `GESKE`, `MESOESTETIC` |
| displayName | String | Spec naming |
| isActivePortfolio | Boolean | Mesoestetic = false for ongoing line |
| mayRecommendAsLead | Boolean | Mesoestetic = false |
| requiresInjectionScope | Boolean | Aptos, Fidia |
| notes | String? | Distributor / stock notes |

**Lead product options** (qualification enum, not all ProductDefinition rows):

- `Aptos`
- `Dermaceutic`
- `Fidia Hy-tissue PRP`
- `GESKE`
- `Aptos 3-level certification`
- `Aptos 4-level certification`

**Stage B — runtime catalog (in-memory via provider, not yet a Prisma table):**

Canonical `NuviorProduct` (`src/domain/products/nuviorProduct.ts`) is loaded through `ProductCatalogProvider` (`mock` \| `odoo` stub). See `docs/ODOO_PRODUCT_CATALOG.md`. Existing `ProductDefinition` + `src/domain/products.ts` remain for Phase 1–8 qualification until unified.

**Stage C — clinic research (runtime + Prisma):**

`ClinicResearchProfile` stores JSON `ClinicCapabilityProfile` snapshots. See `docs/CLINIC_CAPABILITY_PROFILE.md`, `docs/CLAUDE_RESEARCH.md`.

**Stage D — product gap analysis (runtime + Prisma):**

`ProductGapAnalysis` stores JSON gap snapshots keyed by profile + catalog + rules + CRM hash. See `docs/PRODUCT_GAP_ENGINE.md`.

**Stage E — product opportunity scoring (runtime + Prisma):**

`ProductOpportunityAnalysis` stores ranked opportunities + primary selection. See `docs/PRODUCT_OPPORTUNITY_SCORING.md`.

### 3.4 `KeywordBankEntry`

| Field | Type | Notes |
|---|---|---|
| brandGroup | String | Aptos threads, Fidia, Dermaceutic, Mesoestetic, Competitor peels, GESKE |
| isCompetitorBank | Boolean | |
| terms | String[] | Spec §04 terms |

### 3.5 `ProvinceScopeRule`

| Field | Type | Notes |
|---|---|---|
| provinceCode | String | e.g. `ON`, `BC`, `AB` |
| provinceName | String | |
| productCode | String | APTOS / FIDIA_… |
| eligibleCredentials | String[] | e.g. `MD`, `NP`, `RN_UNDER_DIRECTIVE`, `ND` |
| notes | String | Spec language |
| uvSeasonNote | String? | Prairies/north longer low-UV; coastal BC shorter |

---

## 4. Account entities

### 4.1 `Account`

Core identity + location (may originate from Places).

| Field | Source | Notes |
|---|---|---|
| id | system | |
| businessName | places/public | Required |
| parentGroupName | public | Chain parent if known |
| organizationType | derived | Independent / Chain location / Chain head office / Hospital or academic |
| segmentNumber | derived | 1–6 |
| categoryNumber | derived | |
| categoryLabel | derived | Exact taxonomy label |
| streetAddress | places/public | Full address; unknown → UNKNOWN, verify |
| unitSuite | public | |
| city | public | |
| provinceCode | input/public | |
| postalCode | public | |
| googleMapsUrl | places | |
| placeId | places | |
| latitude | places | |
| longitude | places | |
| parkingAccessNote | public | |
| dataCompleteness | system | e.g. verified / needs_verification |
| createdAt / updatedAt | system | |

### 4.2 `AccountPublicProfile` (web-derived only)

| Field | Notes |
|---|---|
| mainPhone | UNKNOWN, verify if missing |
| generalEmail | |
| website | |
| onlineBookingUrl | |
| instagramHandle | |
| instagramFollowers | Int? |
| tiktokHandle | |
| linkedinUrl | |
| serviceMenuSummary | |
| injectablesOffered | yes/no/unknown + which |
| threadsOffered | yes/no; brand PDO/PLLA/competitor/none/unknown |
| devicesOnSite | |
| skincareLines | |
| competitorBrandsVisible | |
| distributorRelationshipVisible | |
| advertisesThreadLifting | Boolean? |
| googleRating | Float? |
| googleReviewCount | Int? |
| pricePositioning | `value` \| `mid` \| `premium` \| unknown |
| yearsInBusiness | |
| expansionSignals | |
| openingHoursJson | |
| closedDays | |
| bestDropInWindow | |
| dropInPolicy | drop-in / appointment / unknown |

### 4.3 `AccountInternalStatus` (NUVIOR only — never from web)

| Field | Notes |
|---|---|
| hasAcademyAccount | Y/N/unknown |
| aptosCertificationLevel | |
| aptosPathway | `3-level` \| `4-level` \| none |
| staffEligibleFor4Level | text / structured |
| formerMesoesteticCustomer | Y/N |
| mesoesteticRetentionFlag | Boolean |
| lastOrderDate | Date? |
| doNotContact | Boolean |
| crmExternalId | optional future link |

### 4.4 `AccountPerson`

| Field | Notes |
|---|---|
| name | Never invent |
| credentials | MD, NP, RN, aesthetician, etc. |
| role | injector / owner / medical director / manager |
| performsInjectables | Boolean? |
| source | evidence link |

### 4.5 `FieldEvidence`

| Field | Notes |
|---|---|
| accountId | FK |
| fieldPath | e.g. `publicProfile.mainPhone` |
| valueSnapshot | |
| sourceType | `places` \| `website` \| `crm` \| `manual` \| `mock` |
| sourceUrl | |
| capturedAt | |
| confidence | optional |
| needsVerification | Boolean |

### 4.6 `AccountQualification` (computed verdict — spec §06)

| Field | Notes |
|---|---|
| fitScore | 1–5 |
| recommendedLeadProduct | Allowed lead only |
| certificationPathwayFit | `3-level` \| `4-level` \| `none` |
| openingAngle | One line |
| scopeBlockedProducts | JSON list of products blocked by SoP |
| exclusionReason | DNC / below score / etc. |
| verifiedByRep | null until rep confirms |
| computedAt | |

---

## 5. Visit list entities

### 5.1 `VisitListRun`

| Field | Notes |
|---|---|
| id | |
| provinceCode | |
| startQuery | address or postal code |
| startLat / startLng | |
| dailyVisitTarget | default 20 |
| maxRadiusKm | |
| minFitScore | |
| alreadyVisitedRaw | text paste |
| revisitsDueRaw | text paste |
| radiusExhausted | Boolean — target not met within radius |
| createdAt | |

### 5.2 `VisitListItem`

| Field | Notes |
|---|---|
| runId | FK |
| accountId | FK |
| sortDistanceKm | |
| postalCodePrefix | for §07 sort presentation |
| isRevisit | Boolean → label **RE-VISIT** |
| fitScore | denormalized |
| leadProduct | |
| openingAngle | |
| needsManualVerification | Boolean |
| rank | list order nearest→farthest |

**Output presentation (spec §07):** table sorted by postal code prefix then fit score descending; also retain geographic generation order (nearest→farthest). Phase 1 UI shows both: primary table per §07, with distance column.

---

## 6. Pre-visit brief structure (spec §09)

Stored as `PreVisitBrief` JSON matching this shape (Phase 1 schema + TypeScript type):

```ts
type PreVisitBrief = {
  accountId: string;
  visitDate: string; // ISO date
  provinceCode: string;
  visitType: "first visit" | "re-visit" | "follow-up on a quote";
  lastVisitNotes: string | null;
  season: "Winter" | "Spring" | "Summer" | "Autumn";
  seasonalPitchOrder: string[]; // from spec, province-adjusted note
  snapshotThreeLines: [string, string, string];
  leadProductForVisit: string; // one only; never Mesoestetic
  leadProductWhy: string;
  secondProductIfFirstLands: string;
  openingLines: {
    cold: string; // < 25 words
    knowsNuvior: string;
    revisit: string;
  };
  fiveQuestions: string[]; // from standing bank, reworded, ordered
  signalsToReadOnSite: string[]; // five concrete
  objectionsAndResponses: { objection: string; response: string }[]; // three
  theAsk: string; // specific next step
  leaveBehind: string;
  doNotSay: string[]; // 2–3 lines
  thinInputWarnings: string[]; // what to confirm in first two minutes
  generatedAt: string;
  generator: "template" | "llm";
};
```

Standing question bank (spec §09) is seeded as static content, not invented.

Seasonal pitch order:

| Season | Months | Order (spec) |
|---|---|---|
| Winter | Dec–Feb | Dermaceutic peels → Aptos threads → Certification dates |
| Spring | Mar–May | Aptos threads → Dermaceutic brightening/acne → Hy-tissue PRP hair |
| Summer | Jun–Aug | GESKE retail → Hy-tissue PRP → Autumn certification bookings |
| Autumn | Sep–Nov | Dermaceutic peels/pigmentation → Aptos threads → Retail stocking |

Province adjustment note only (spec): prairies/north longer low-UV window; coastal BC shorter — stored as rule metadata, not invented pitch content.

---

## 7. External vs internal data dependency map

| Data | Dependency | Phase 1 |
|---|---|---|
| Lat/lng, Place ID, Maps link, rating | Places API | Mock |
| Address accuracy | Places / geo | Mock fixtures |
| Website, phone, hours, Instagram | Research / Places | Mock or UNKNOWN |
| Practitioners, brands, devices | Research | Mock or UNKNOWN |
| Academy account, certs, orders, DNC | NUVIOR CRM | Mock CrmProvider |
| Already visited / revisits | Rep paste (+ future CRM) | Form paste |
| Brief narrative polish | LLM | Template generator |

---

## 8. Prisma model names (Phase 1)

Implemented in `prisma/schema.prisma`:

- `TaxonomySegment`, `TaxonomyCategory`
- `ProductDefinition`, `KeywordBankEntry`
- `ProvinceScopeRule`
- `Account`, `AccountPublicProfile`, `AccountInternalStatus`, `AccountPerson`, `FieldEvidence`, `AccountQualification`
- `VisitListRun`, `VisitListItem`
- `PreVisitBrief`
- `PlacesApiCache` (Phase 2)

Enums mirror spec terminology where possible (`OrganizationType`, `LeadProduct`, `CertificationPathway`, `VisitType`, `PricePositioning`, `Season`).
