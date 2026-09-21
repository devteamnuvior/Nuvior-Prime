/**
 * Odoo product catalog adapter — contract boundary only.
 *
 * Do NOT invent Odoo RPC methods, field names, or endpoints.
 * Provider remains unavailable until a real integration is registered.
 *
 * @see docs/ODOO_PRODUCT_CATALOG.md § Odoo integration boundary
 */

import type {
  NuviorProduct,
  ProductCatalogMetadata,
  ProductFamilySummary,
} from "@/domain/products/nuviorProduct";
import type { ProductCatalogProvider } from "./types";

export class OdooProductCatalogProvider implements ProductCatalogProvider {
  readonly name = "odoo";
  private reason: string;

  constructor(reason?: string) {
    const base = (process.env.ODOO_BASE_URL ?? "").trim();
    if (reason) {
      this.reason = reason;
    } else if (!base) {
      this.reason =
        "PRODUCT_CATALOG_PROVIDER=odoo but ODOO_BASE_URL is not configured — no Odoo contract invented; use mock or wait for adapter";
    } else {
      this.reason =
        "ODOO_BASE_URL is set but no Odoo product-catalog adapter is registered in-repo — read-only integration not yet implemented";
    }
  }

  isUnavailable(): boolean {
    return true;
  }

  getUnavailableReason(): string | null {
    return this.reason;
  }

  async listProducts(): Promise<NuviorProduct[]> {
    return [];
  }

  async listActiveProducts(): Promise<NuviorProduct[]> {
    return [];
  }

  async getProductById(): Promise<NuviorProduct | null> {
    return null;
  }

  async listProductFamilies(): Promise<ProductFamilySummary[]> {
    return [];
  }

  async getProductsByCapability(): Promise<NuviorProduct[]> {
    return [];
  }

  async getCatalogMetadata(): Promise<ProductCatalogMetadata> {
    return {
      provider: this.name,
      source: "odoo",
      fetchedAt: new Date().toISOString(),
      sourceUpdatedAt: null,
      catalogVersion: "unavailable",
      productCount: 0,
      activeProductCount: 0,
      capabilityTaxonomyVersion: "1.0.0",
      stale: true,
      staleReason: this.reason,
    };
  }
}
