/** Spec §01 / §06 product definitions. Mesoestetic is stock-only, never an ongoing lead. */

export type ProductSeed = {
  code: string;
  displayName: string;
  isActivePortfolio: boolean;
  mayRecommendAsLead: boolean;
  requiresInjectionScope: boolean;
  notes: string;
};

export const PRODUCTS: ProductSeed[] = [
  {
    code: "APTOS",
    displayName: "Aptos",
    isActivePortfolio: true,
    mayRecommendAsLead: true,
    requiresInjectionScope: true,
    notes:
      "Bioabsorbable lifting threads. Requires physician or NP injector; new policy for RNs, IMGs, NDs in BC, and allied professionals. Health Canada licensed.",
  },
  {
    code: "DERMACEUTIC",
    displayName: "Dermaceutic",
    isActivePortfolio: true,
    mayRecommendAsLead: true,
    requiresInjectionScope: false,
    notes: "France: clinical peels and cosmeceuticals. No injection restriction.",
  },
  {
    code: "FIDIA_HY_TISSUE_PRP",
    displayName: "Fidia Hy-tissue PRP",
    isActivePortfolio: true,
    mayRecommendAsLead: true,
    requiresInjectionScope: true,
    notes:
      "Italy: Hy-tissue PRP. Requires practitioner licensed to draw blood and inject. Health Canada licensed.",
  },
  {
    code: "GESKE",
    displayName: "GESKE",
    isActivePortfolio: true,
    mayRecommendAsLead: true,
    requiresInjectionScope: false,
    notes: "Germany: at-home beauty devices / retail. No injection restriction.",
  },
  {
    code: "MESOESTETIC",
    displayName: "Mesoestetic",
    isActivePortfolio: false,
    mayRecommendAsLead: false,
    requiresInjectionScope: false,
    notes:
      "NUVIOR is no longer the Canadian distributor. Remaining stock on a limited number of SKUs only while it lasts. Never pitch as ongoing line or exclusive/current distributor. Former customers: retention conversation via Dermaceutic.",
  },
];

/** Spec §04 keyword bank */
export type KeywordBankSeed = {
  brandGroup: string;
  isCompetitorBank: boolean;
  terms: string[];
};

export const KEYWORD_BANK: KeywordBankSeed[] = [
  {
    brandGroup: "Aptos threads",
    isCompetitorBank: false,
    terms: [
      "thread lift",
      "PDO threads",
      "non-surgical facelift",
      "silhouette lift",
      "jawline lift",
      "nurse injector",
      "medical director aesthetics",
      "cosmetic physician",
      "botox and filler clinic",
      "medical aesthetics clinic",
    ],
  },
  {
    brandGroup: "Fidia Hy-tissue PRP",
    isCompetitorBank: false,
    terms: [
      "PRP",
      "platelet rich plasma",
      "PRP hair restoration",
      "PRP facial",
      "vampire facial",
      "regenerative injection",
      "orthobiologics",
      "PRP knee injection",
      "sports medicine injection clinic",
    ],
  },
  {
    brandGroup: "Dermaceutic",
    isCompetitorBank: false,
    terms: [
      "chemical peel",
      "medical grade skincare",
      "professional peel",
      "corrective facial",
      "skin rejuvenation",
      "cosmeceutical",
      "retinol peel",
      "glycolic peel",
      "TCA peel",
      "brightening treatment",
      "anti-ageing facial",
    ],
  },
  {
    brandGroup: "Mesoestetic",
    isCompetitorBank: false,
    terms: [
      "cosmelan",
      "dermamelan",
      "acnelan",
      "mesopeel",
      "mesotherapy",
      "age element facial",
      "depigmentation peel",
      "melasma treatment",
      "hyperpigmentation clinic",
      "dark spot treatment",
      "acne clinic",
      "skin brightening",
    ],
  },
  {
    brandGroup: "Competitor peel and cosmeceutical lines",
    isCompetitorBank: true,
    terms: [
      "ZO Skin Health",
      "Obagi",
      "SkinCeuticals",
      "AlumierMD",
      "Vivier",
      "VI Peel",
      "PCA Skin",
      "Neostrata",
      "Environ",
      "Image Skincare",
      "SkinMedica",
      "Perfect Derma Peel",
    ],
  },
  {
    brandGroup: "GESKE",
    isCompetitorBank: false,
    terms: [
      "facial cleansing brush",
      "at-home beauty device",
      "skincare tools",
      "LED mask",
      "sonic facial device",
      "spa retail",
      "beauty boutique",
      "skincare gift shop",
    ],
  },
];
