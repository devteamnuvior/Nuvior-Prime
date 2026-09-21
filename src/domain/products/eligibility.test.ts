import { describe, expect, it } from "vitest";
import { isProductRecommendable } from "./eligibility";
import { CATALOG_PRODUCT_IDS } from "./leadProductCompat";
import { MOCK_CATALOG_FIXTURES } from "@/providers/productCatalog/mockCatalogFixtures";

const byId = (id: string) => MOCK_CATALOG_FIXTURES.find((p) => p.id === id)!;

const physicianCredentials = {
  hasPhysicianOrNp: true,
  hasRn: false,
  hasNd: false,
  hasImg: false,
  hasAllied: false,
  physicianOrNpOnSiteForPrp: true,
  rnHasPhysicianDirective: false,
};

const onPhysician = {
  provinceCode: "ON",
  credentials: physicianCredentials,
};

describe("product recommendation eligibility", () => {
  it("allows active sellable Aptos for eligible scope", () => {
    const r = isProductRecommendable(byId(CATALOG_PRODUCT_IDS.APTOS), onPhysician);
    expect(r.eligible).toBe(true);
  });

  it("blocks inactive products", () => {
    const r = isProductRecommendable(byId("nuvior-aptos-legacy-kit"), onPhysician);
    expect(r.eligible).toBe(false);
    expect(r.reasons.some((x) => /inactive/i.test(x))).toBe(true);
  });

  it("blocks non-sellable products", () => {
    const r = isProductRecommendable(byId("nuvior-geske-wholesale-only"), onPhysician);
    expect(r.eligible).toBe(false);
    expect(r.reasons.some((x) => /not sellable/i.test(x))).toBe(true);
  });

  it("blocks Mesoestetic always", () => {
    const r = isProductRecommendable(byId(CATALOG_PRODUCT_IDS.MESOESTETIC_HISTORICAL), onPhysician);
    expect(r.eligible).toBe(false);
    expect(r.reasons.some((x) => /Mesoestetic/i.test(x))).toBe(true);
  });

  it("blocks province-restricted products", () => {
    const r = isProductRecommendable(byId("nuvior-fidia-restricted-demo"), {
      ...onPhysician,
      provinceCode: "QC",
    });
    expect(r.eligible).toBe(false);
    expect(r.reasons.some((x) => /QC/i.test(x))).toBe(true);
  });

  it("blocks training products without training context", () => {
    const r = isProductRecommendable(byId(CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION), onPhysician);
    expect(r.eligible).toBe(false);
    expect(r.reasons.some((x) => /training/i.test(x))).toBe(true);
  });

  it("allows training products when context permits", () => {
    const r = isProductRecommendable(byId(CATALOG_PRODUCT_IDS.APTOS_3_LEVEL_CERTIFICATION), {
      ...onPhysician,
      allowTrainingProducts: true,
    });
    expect(r.eligible).toBe(true);
  });

  it("blocks Aptos when injection scope fails", () => {
    const r = isProductRecommendable(byId(CATALOG_PRODUCT_IDS.APTOS), {
      provinceCode: "ON",
      credentials: {
        hasPhysicianOrNp: false,
        hasRn: false,
        hasNd: false,
        hasImg: false,
        hasAllied: true,
        physicianOrNpOnSiteForPrp: false,
        rnHasPhysicianDirective: false,
      },
    });
    expect(r.eligible).toBe(false);
    expect(r.reasons.some((x) => /scope/i.test(x))).toBe(true);
  });
});
