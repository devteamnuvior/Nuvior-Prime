/**
 * Gap validation scenarios — maps Stage C fixtures + CRM overrides to expected cases A–I.
 */

import type { GapCrmContext } from "./gapContext";
import type { AccountCredentialSignals } from "@/domain/scopeOfPractice";

export type GapScenario = {
  id: string;
  label: string;
  fixtureId: string;
  provinceCode: string;
  credentials?: AccountCredentialSignals;
  crm?: Partial<GapCrmContext>;
  expectGapTypes?: string[];
  expectNoGapForCapability?: string;
  expectNoGaps?: boolean;
  expectNoClearGap?: boolean;
};

export const GAP_VALIDATION_SCENARIOS: GapScenario[] = [
  {
    id: "case-a-strong-aptos",
    label: "Case A — strong Aptos/thread capability gap",
    fixtureId: "fixture-injectable-clinic",
    provinceCode: "ON",
    expectGapTypes: ["CAPABILITY_GAP"],
    expectNoGapForCapability: undefined,
  },
  {
    id: "case-b-threads-present",
    label: "Case B — threads CONFIRMED_PRESENT → no thread capability gap",
    fixtureId: "fixture-threads-clinic",
    provinceCode: "ON",
    expectNoGapForCapability: "THREAD_LIFTING",
  },
  {
    id: "case-c-dermaceutic-line",
    label: "Case C — skincare/product-line gap candidate",
    fixtureId: "fixture-skincare-brands",
    provinceCode: "ON",
    expectGapTypes: ["PRODUCT_LINE_GAP"],
  },
  {
    id: "case-d-prp-fidia",
    label: "Case D — PRP present → Fidia product-line candidate",
    fixtureId: "fixture-prp-clinic",
    provinceCode: "ON",
    expectGapTypes: ["PRODUCT_LINE_GAP"],
  },
  {
    id: "case-e-geske-retail",
    label: "Case E — GESKE retail device gap candidate",
    fixtureId: "fixture-spa-retail",
    provinceCode: "ON",
    expectGapTypes: ["CAPABILITY_GAP"],
  },
  {
    id: "case-f-former-meso",
    label: "Case F — former Meso → Dermaceutic retention gap",
    fixtureId: "fixture-sparse-website",
    provinceCode: "ON",
    crm: { formerMesoesteticCustomer: true },
    expectGapTypes: ["RETENTION_GAP"],
  },
  {
    id: "case-g-sparse",
    label: "Case G — sparse website → no clear gap",
    fixtureId: "fixture-sparse-website",
    provinceCode: "ON",
    expectNoClearGap: true,
  },
  {
    id: "case-h-scope-blocked",
    label: "Case H — ND-only ON → no Aptos capability gap",
    fixtureId: "fixture-injectable-clinic",
    provinceCode: "ON",
    credentials: {
      hasPhysicianOrNp: false,
      hasRn: false,
      hasNd: true,
      hasImg: false,
      hasAllied: false,
      physicianOrNpOnSiteForPrp: false,
      rnHasPhysicianDirective: false,
    },
    expectNoGapForCapability: "THREAD_LIFTING",
  },
  {
    id: "case-i-training",
    label: "Case I — missing Aptos certification → training gap",
    fixtureId: "fixture-injectable-clinic",
    provinceCode: "ON",
    crm: { aptosCertificationLevel: null, hasAcademyAccount: false },
    expectGapTypes: ["TRAINING_GAP"],
  },
];
