# Product Opportunity Scoring (Stage E)

**Status:** Complete  
**Scoring version:** `PRODUCT_OPPORTUNITY_SCORING_VERSION=1.0.0`  
**Boundary:** Ranking only — no UI, brief integration, or route-priority changes.

---

## Purpose

Convert persisted `ProductGapAnalysis` into ranked, evidence-backed NUVIOR product opportunities with one deterministic primary recommendation when thresholds are met.

```
ClinicCapabilityProfile → ProductGapAnalysis → scoreProductOpportunities()
  → ProductOpportunityAnalysis (ranked opportunities + primary)
```

Claude does **not** calculate or override scores.

Account Fit (`fitScore`) remains separate — it answers “should we visit?” Product Opportunity answers “what should we lead with?”

---

## ProductOpportunityAnalysis

| Field | Description |
| --- | --- |
| clinicId | Account identifier |
| analyzedAt | ISO timestamp |
| gapAnalysisVersion | Hash of Stage D inputs |
| catalogVersion | Catalog snapshot version |
| scoringRulesVersion | `1.0.0` |
| crmContextHash | CRM fields affecting scoring |
| opportunities[] | Ranked eligible `ProductOpportunity` |
| primaryOpportunityId | Selected primary (or null) |
| primaryProductId | Catalog id of primary (or null) |
| primaryRecommendationStatus | `CONFIRMED` / `PENDING_VERIFICATION` / `NONE` / `BLOCKED_DNC` |
| noRecommendationReasons[] | Why no primary when applicable |
| blockedOpportunities[] | Hard-gated products |
| evidenceRefs[] | Linked profile evidence |
| accountFitScore | Optional passthrough — **not used in scoring** |

---

## Score formula (0–100)

All weights in `src/domain/opportunity/scoringConfig.ts`.

```
total = clamp(0, 100,
  gapStrengthPoints      (max inventory-state points across gaps)
+ adjacencyPoints        (adjacent signals + gap confidence)
+ evidencePoints         (HIGH/MEDIUM evidence refs, capped)
+ gapTypeBonusPoints     (per gap type, capped at 20)
+ crmModifier            (once per product)
+ commercialPriorityModifier (catalog commercialPriority / 100 × 10)
+ trainingModifier       (TRAINING_GAP + training product)
+ prerequisiteModifier   (training dominance / direct-product penalty)
- uncertaintyPenalty     (verification / NOT_FOUND / AMBIGUOUS, capped at 18)
)
```

Every opportunity persists full `scoreComponents` for auditability.

---

## Score bands

| Band | Range |
| --- | --- |
| VERY_HIGH | 85–100 |
| HIGH | 70–84 |
| MEDIUM | 50–69 |
| LOW | 30–49 |
| VERY_LOW | 0–29 |

---

## Confidence (separate from score)

`HIGH` / `MEDIUM` / `LOW` — based on gap confidence, verification burden, evidence quality.

Example: score 82 + confidence MEDIUM when a key capability is only `NOT_FOUND`.

`RETENTION_GAP` (CRM-authoritative) defaults to MEDIUM confidence.

---

## Hard gates (before scoring)

Products failing `isProductRecommendable()` go to `blockedOpportunities` — not low-scored opportunities:

- inactive / non-sellable / non-recommendable
- Mesoestetic prohibition
- province restrictions
- scope blocks
- certification level already achieved

---

## DNC behavior

When `doNotContact=true`:

- Opportunities may still be computed with `eligibilityState=BLOCKED_DNC`
- `primaryRecommendationStatus=BLOCKED_DNC`
- No actionable primary — DNC is never overridden by score

---

## Gap → product aggregation

Multiple gaps pointing at the same `productId` merge into one `ProductOpportunity` with all `relatedGapIds[]`.

---

## Primary selection

1. Filter `eligibilityState=ELIGIBLE` (excludes DNC-blocked)
2. Sort by tie-break order (below)
3. Apply thresholds:
   - **Confirmed primary:** score ≥ 50, confidence ≥ MEDIUM, no verification required
   - **Pending verification:** score ≥ 45 with verification required, or score ≥ 50 with LOW confidence
   - **None:** below thresholds or no eligible opportunities

---

## Tie-breaking

1. Higher opportunity score
2. Higher confidence
3. More HIGH-confidence evidence refs
4. Higher catalog `commercialPriority`
5. Lexicographic `productId`

---

## Training vs direct product

When `TRAINING_GAP` exists for Aptos family:

- Certification products receive `trainingModifier` + `prerequisiteModifier` (+22 dominance)
- Direct Aptos product receives `-18` prerequisite penalty
- Certification outranks direct product when training is prerequisite

---

## Former Mesoestetic

`formerMesoesteticCustomer` adds +12 CRM modifier to Dermaceutic opportunities. Mesoestetic never scores or becomes primary.

---

## Persistence

Prisma `ProductOpportunityAnalysis` — cache key:

`gapAnalysisVersion | catalogVersion | scoringRulesVersion | crmContextHash`

See `src/lib/opportunityPersistence.ts`.

---

## Validation

```bash
npm run validate:product-opportunities
```

Nine calibration scenarios (Cases A–I) with score components, confidence, primary status.

---

## Stage F readiness

Stage E provides ranked opportunities, inspectable score components, primary selection with verification state, and versioned cache keys for rep-facing UI and pre-visit brief integration.
