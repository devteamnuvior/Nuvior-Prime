/**
 * Aggregate Stage D gaps into per-product buckets.
 */

import type { ProductGap } from "@/domain/gap/productGapAnalysis";

export type ProductGapBucket = {
  productId: string;
  gaps: ProductGap[];
  gapIds: string[];
};

export function aggregateGapsByProduct(gaps: ProductGap[]): ProductGapBucket[] {
  const map = new Map<string, ProductGap[]>();

  for (const gap of gaps) {
    for (const productId of gap.relevantProductIds) {
      const list = map.get(productId) ?? [];
      list.push(gap);
      map.set(productId, list);
    }
  }

  return [...map.entries()].map(([productId, gapList]) => ({
    productId,
    gaps: gapList,
    gapIds: gapList.map((g) => g.id),
  }));
}
