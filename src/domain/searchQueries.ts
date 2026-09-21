/**
 * Focused search queries derived from spec §04 keyword bank + taxonomy-relevant clinic terms.
 * Multiple small queries — never one giant OR-blob.
 * Mesoestetic terms are discovery signals only (never lead products).
 */

export type FocusedSearchQuery = {
  id: string;
  signal: string;
  query: string;
  /** Mesoestetic discovery only — never maps to lead product. */
  mesoesteticDiscoveryOnly?: boolean;
};

export const FOCUSED_SEARCH_QUERIES: FocusedSearchQuery[] = [
  // Aptos / thread lifting
  { id: "aptos-1", signal: "Aptos threads", query: "medical aesthetics clinic" },
  { id: "aptos-2", signal: "Aptos threads", query: "thread lift clinic" },
  { id: "aptos-3", signal: "Aptos threads", query: "PDO threads" },
  { id: "aptos-4", signal: "Aptos threads", query: "nurse injector clinic" },
  { id: "aptos-5", signal: "Aptos threads", query: "cosmetic physician botox filler" },

  // PRP / regenerative
  { id: "fidia-1", signal: "Fidia Hy-tissue PRP", query: "PRP clinic" },
  { id: "fidia-2", signal: "Fidia Hy-tissue PRP", query: "platelet rich plasma hair" },
  { id: "fidia-3", signal: "Fidia Hy-tissue PRP", query: "sports medicine injection clinic" },

  // Peels / medical-grade skincare
  { id: "derm-1", signal: "Dermaceutic", query: "chemical peel clinic" },
  { id: "derm-2", signal: "Dermaceutic", query: "medical grade skincare clinic" },
  { id: "derm-3", signal: "Dermaceutic", query: "dermatology cosmetic clinic" },

  // Competitor skincare signals (discovery of buyers in category)
  { id: "comp-1", signal: "Competitor peel and cosmeceutical lines", query: "ZO Skin Health clinic" },
  { id: "comp-2", signal: "Competitor peel and cosmeceutical lines", query: "SkinCeuticals clinic" },

  // Mesoestetic — discovery only
  {
    id: "meso-1",
    signal: "Mesoestetic",
    query: "melasma treatment clinic",
    mesoesteticDiscoveryOnly: true,
  },
  {
    id: "meso-2",
    signal: "Mesoestetic",
    query: "depigmentation peel clinic",
    mesoesteticDiscoveryOnly: true,
  },

  // GESKE-compatible retail / wellness
  { id: "geske-1", signal: "GESKE", query: "skincare boutique" },
  { id: "geske-2", signal: "GESKE", query: "day spa retail skincare" },

  // Taxonomy-relevant clinic categories
  { id: "tax-1", signal: "Taxonomy clinic", query: "plastic surgery clinic" },
  { id: "tax-2", signal: "Taxonomy clinic", query: "medical spa" },
  { id: "tax-3", signal: "Taxonomy clinic", query: "hair restoration clinic" },
  { id: "tax-4", signal: "Taxonomy clinic", query: "naturopathic clinic" },
];

/** Default progressive radius rings (km). Clamped to maxRadiusKm at runtime. */
export const DEFAULT_RADIUS_RINGS_KM = [5, 10, 20, 30, 40];

export function radiusRingsUpTo(maxRadiusKm: number, rings = DEFAULT_RADIUS_RINGS_KM): number[] {
  const filtered = rings.filter((r) => r < maxRadiusKm);
  if (!filtered.includes(maxRadiusKm)) filtered.push(maxRadiusKm);
  return [...new Set(filtered)].sort((a, b) => a - b);
}

/**
 * Cost-safe subset: covers Aptos, PRP, peels, competitor, Mesoestetic discovery,
 * GESKE, and core taxonomy clinics — without exhausting the search budget.
 */
export const PRIORITY_SEARCH_QUERY_IDS = [
  "aptos-1",
  "aptos-2",
  "fidia-1",
  "derm-1",
  "meso-1",
  "comp-1",
  "geske-1",
  "tax-1",
  "tax-2",
  "aptos-4",
  "fidia-3",
  "derm-3",
] as const;

export function selectFocusedQueries(maxQueries: number): FocusedSearchQuery[] {
  const priority = PRIORITY_SEARCH_QUERY_IDS.map(
    (id) => FOCUSED_SEARCH_QUERIES.find((q) => q.id === id)!,
  ).filter(Boolean);
  if (maxQueries >= FOCUSED_SEARCH_QUERIES.length) return [...FOCUSED_SEARCH_QUERIES];
  return priority.slice(0, maxQueries);
}
