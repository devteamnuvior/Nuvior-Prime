#!/usr/bin/env tsx
/**
 * Validate product catalog env — no secrets printed.
 */
import { validateProductCatalogEnv } from "../src/lib/productCatalogConfig";
import { getProductCatalogProvider } from "../src/providers/productCatalog";

async function main() {
  const v = validateProductCatalogEnv();
  const provider = getProductCatalogProvider();

  console.log("Product catalog validation");
  console.log("  PRODUCT_CATALOG_PROVIDER:", process.env.PRODUCT_CATALOG_PROVIDER ?? "mock (default)");
  console.log("  provider.name:", provider.name);
  console.log("  provider.isUnavailable():", provider.isUnavailable());
  if (provider.isUnavailable()) {
    console.log("  reason:", provider.getUnavailableReason());
  }

  if (v.warnings.length) {
    console.log("\nWarnings:");
    for (const w of v.warnings) console.log("  -", w);
  }
  if (v.errors.length) {
    console.log("\nErrors:");
    for (const e of v.errors) console.log("  -", e);
    process.exit(1);
  }

  if (!provider.isUnavailable()) {
    const meta = await provider.getCatalogMetadata();
    const active = await provider.listActiveProducts();
    console.log("\nCatalog snapshot:");
    console.log("  version:", meta.catalogVersion);
    console.log("  products:", meta.productCount, "active:", meta.activeProductCount);
    console.log("  active recommendable families:", active.filter((p) => p.recommendable).length);
  }

  console.log("\nOK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
