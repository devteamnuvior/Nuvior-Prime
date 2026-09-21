import type {
  NuviorProduct,
  ProductCatalogMetadata,
  ProductFamilySummary,
} from "@/domain/products/nuviorProduct";
import type { ProductCatalogProvider } from "./types";

export class UnavailableProductCatalogProvider implements ProductCatalogProvider {
  readonly name = "unavailable";

  constructor(private reason: string) {}

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
      source: "mock",
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
