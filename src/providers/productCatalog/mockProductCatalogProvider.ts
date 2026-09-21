import { CAPABILITY_TAXONOMY_VERSION } from "@/domain/products/capabilityTaxonomy";
import type {
  NuviorProduct,
  ProductCatalogMetadata,
  ProductFamilyCode,
  ProductFamilySummary,
} from "@/domain/products/nuviorProduct";
import type { CapabilityTag } from "@/domain/products/capabilityTaxonomy";
import type { ProductCatalogProvider } from "./types";
import {
  MOCK_CATALOG_FIXTURES,
  MOCK_CATALOG_VERSION,
  MOCK_SOURCE_UPDATED,
} from "./mockCatalogFixtures";

const FAMILY_LABELS: Record<ProductFamilyCode, { displayName: string; brand: string }> = {
  APTOS: { displayName: "Aptos", brand: "Aptos" },
  DERMACEUTIC: { displayName: "Dermaceutic", brand: "Dermaceutic" },
  FIDIA_HY_TISSUE_PRP: { displayName: "Fidia Hy-tissue PRP", brand: "Fidia" },
  GESKE: { displayName: "GESKE", brand: "GESKE" },
  MESOESTETIC: { displayName: "Mesoestetic (historical)", brand: "Mesoestetic" },
};

export class MockProductCatalogProvider implements ProductCatalogProvider {
  readonly name = "mock";
  private unavailable: boolean;
  private reason: string | null;
  private fetchedAt: string;

  constructor(options?: { unavailable?: boolean; reason?: string }) {
    this.unavailable = options?.unavailable ?? false;
    this.reason = options?.reason ?? null;
    this.fetchedAt = new Date().toISOString();
  }

  isUnavailable(): boolean {
    return this.unavailable;
  }

  getUnavailableReason(): string | null {
    return this.unavailable ? (this.reason ?? "Mock catalog unavailable") : null;
  }

  async listProducts(): Promise<NuviorProduct[]> {
    if (this.unavailable) return [];
    return [...MOCK_CATALOG_FIXTURES];
  }

  async listActiveProducts(): Promise<NuviorProduct[]> {
    const all = await this.listProducts();
    return all.filter((p) => p.active);
  }

  async getProductById(id: string): Promise<NuviorProduct | null> {
    const all = await this.listProducts();
    return all.find((p) => p.id === id) ?? null;
  }

  async listProductFamilies(): Promise<ProductFamilySummary[]> {
    const all = await this.listProducts();
    const codes = Object.keys(FAMILY_LABELS) as ProductFamilyCode[];
    return codes.map((code) => {
      const active = all.filter((p) => p.productFamily === code && p.active);
      const meta = FAMILY_LABELS[code];
      const recommendable = code !== "MESOESTETIC" && active.some((p) => p.recommendable);
      return {
        code,
        displayName: meta.displayName,
        brand: meta.brand,
        activeProductCount: active.length,
        recommendable,
      };
    });
  }

  async getProductsByCapability(tag: CapabilityTag): Promise<NuviorProduct[]> {
    const all = await this.listProducts();
    return all.filter((p) => p.capabilityTags.includes(tag));
  }

  async getCatalogMetadata(): Promise<ProductCatalogMetadata> {
    const all = await this.listProducts();
    const active = all.filter((p) => p.active);
    return {
      provider: this.name,
      source: "mock",
      fetchedAt: this.fetchedAt,
      sourceUpdatedAt: MOCK_SOURCE_UPDATED,
      catalogVersion: MOCK_CATALOG_VERSION,
      productCount: all.length,
      activeProductCount: active.length,
      capabilityTaxonomyVersion: CAPABILITY_TAXONOMY_VERSION,
      stale: false,
      staleReason: null,
    };
  }
}
