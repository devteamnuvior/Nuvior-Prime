#!/usr/bin/env tsx
/**
 * validate:product-opportunities — calibration output for Stage E fixtures.
 */

import { runGapAnalysisForFixture } from "../src/domain/gap/gapTestHelpers";
import { runOpportunityScoringForFixture } from "../src/domain/opportunity/opportunityTestHelpers";
import { OPPORTUNITY_VALIDATION_SCENARIOS } from "../src/domain/opportunity/opportunityScenarios";
import { PRODUCT_OPPORTUNITY_SCORING_VERSION } from "../src/domain/opportunity/scoringConfig";
import { MOCK_CATALOG_FIXTURES } from "../src/providers/productCatalog/mockCatalogFixtures";

async function main() {
  console.log("Product opportunity validation (deterministic fixtures)\n");
  console.log("  PRODUCT_OPPORTUNITY_SCORING_VERSION:", PRODUCT_OPPORTUNITY_SCORING_VERSION);

  let ok = 0;

  for (const scenario of OPPORTUNITY_VALIDATION_SCENARIOS) {
    const gapAnalysis = await runGapAnalysisForFixture({
      fixtureId: scenario.fixtureId,
      provinceCode: scenario.provinceCode,
      credentials: scenario.credentials,
      crm: scenario.crm,
    });

    const analysis = await runOpportunityScoringForFixture({
      fixtureId: scenario.fixtureId,
      provinceCode: scenario.provinceCode,
      credentials: scenario.credentials,
      crm: scenario.crm,
      accountFitScore: null,
    });

    console.log(`\n--- ${scenario.id}: ${scenario.label} ---`);
    console.log("  account fit:", analysis.accountFitScore ?? "(not computed — separate from scoring)");
    console.log("  gaps detected:", gapAnalysis.gaps.length);
    for (const g of gapAnalysis.gaps) {
      console.log(`    gap ${g.gapType} → ${g.relevantProductIds.join(", ")}`);
    }

    console.log("  eligible products:", analysis.opportunities.length);
    for (const o of analysis.opportunities) {
      const product = MOCK_CATALOG_FIXTURES.find((p) => p.id === o.productId);
      console.log(`    ${product?.name ?? o.productId}`);
      console.log(`      score=${o.opportunityScore} band=${o.scoreBand} confidence=${o.confidence}`);
      console.log(
        `      components: gap=${o.scoreComponents.gapStrengthPoints} adj=${o.scoreComponents.adjacencyPoints} ev=${o.scoreComponents.evidencePoints} crm=${o.scoreComponents.crmModifier} comm=${o.scoreComponents.commercialPriorityModifier} train=${o.scoreComponents.trainingModifier} prereq=${o.scoreComponents.prerequisiteModifier} penalty=-${o.scoreComponents.uncertaintyPenalty}`,
      );
      console.log(`      eligibility=${o.eligibilityState} verification=${o.verificationRequired ? "yes" : "no"}`);
      if (o.verificationQuestions.length) {
        console.log(`      verify: "${o.verificationQuestions[0]}"`);
      }
    }

    if (analysis.blockedOpportunities.length) {
      console.log("  blocked:", analysis.blockedOpportunities.length);
      for (const b of analysis.blockedOpportunities) {
        console.log(`    ${b.productId} (${b.eligibilityState}): ${b.blockingReasons[0]}`);
      }
    }

    console.log("  primary status:", analysis.primaryRecommendationStatus);
    console.log("  primary product:", analysis.primaryProductId ?? "(none)");
    if (analysis.noRecommendationReasons.length) {
      console.log("  no-recommendation:", analysis.noRecommendationReasons.join("; "));
    }

    ok += 1;
  }

  console.log(`\n${ok}/${OPPORTUNITY_VALIDATION_SCENARIOS.length} scenarios OK`);
  if (ok !== OPPORTUNITY_VALIDATION_SCENARIOS.length) process.exit(1);
  console.log("\nOK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
