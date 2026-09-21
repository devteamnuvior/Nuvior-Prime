/**
 * Exact category taxonomy from NUVIOR_PRIME_SPEC.md §03.
 * Labels must match the specification character-for-character.
 */

export type TaxonomySeedCategory = {
  number: number;
  label: string;
};

export type TaxonomySeedSegment = {
  number: number;
  name: string;
  subtitle: string;
  priorityNote?: string;
  categories: TaxonomySeedCategory[];
};

export const TAXONOMY: TaxonomySeedSegment[] = [
  {
    number: 1,
    name: "Physician & NP led medical aesthetics",
    subtitle: "Physician & NP led medical aesthetics · highest priority",
    priorityNote: "highest priority",
    categories: [
      { number: 1, label: "Plastic & cosmetic surgery clinic" },
      { number: 2, label: "Dermatology clinic, medical and/or cosmetic" },
      { number: 3, label: "Physician-led cosmetic medicine clinic (GP/family physician)" },
      { number: 4, label: "Nurse practitioner-led injectable clinic" },
      { number: 5, label: "Facial plastics practice" },
      { number: 6, label: "Oculoplastic / ophthalmology aesthetics practice" },
      { number: 7, label: "Hair restoration & transplant clinic" },
      { number: 8, label: "Trichology / medical hair loss clinic" },
      { number: 9, label: "Regenerative, longevity or anti-ageing medicine clinic" },
      { number: 10, label: "Walk-in or family medicine clinic with a cosmetic side-service" },
      { number: 11, label: "IMG-staffed aesthetic clinic" },
      { number: 12, label: "Naturopathic clinic (ND)" },
    ],
  },
  {
    number: 2,
    name: "Medical & regenerative, non-aesthetic entry point",
    subtitle: "Medical & regenerative, non-aesthetic entry point · PRP-led",
    categories: [
      { number: 1, label: "Sports medicine clinic" },
      { number: 2, label: "Orthopaedic surgery / sports injury practice" },
      { number: 3, label: "Pain management clinic" },
      { number: 4, label: "Physiatry / physical medicine & rehabilitation" },
      { number: 5, label: "Podiatry & foot clinic" },
      { number: 6, label: "Gynaecology & women's health clinic" },
    ],
  },
  {
    number: 3,
    name: "Nurse-led and medically supervised aesthetics",
    subtitle: "Nurse-led and medically supervised aesthetics",
    categories: [
      { number: 1, label: "Medical spa, physician-owned or physician-supervised" },
      { number: 2, label: "RN-led injector studio / nurse injector clinic" },
      { number: 3, label: "Laser & skin clinic" },
      { number: 4, label: "Body contouring / sculpting studio" },
      { number: 5, label: "Multi-location medspa group or franchise head office" },
      { number: 6, label: "IV therapy & wellness infusion lounge" },
    ],
  },
  {
    number: 4,
    name: "Aesthetician-led and skin-focused",
    subtitle: "Aesthetician-led and skin-focused",
    categories: [
      { number: 1, label: "Aesthetician-led skin studio / facial bar" },
      { number: 2, label: "Acne clinic / acne specialist studio" },
      { number: 3, label: "Pigmentation & melasma specialist clinic" },
      { number: 4, label: "Microneedling & dermaplaning studio" },
      { number: 5, label: "Permanent makeup, microblading & PMU studio" },
      { number: 6, label: "Laser hair removal clinic or chain" },
      { number: 7, label: "Lash, brow & waxing studio" },
      { number: 8, label: "Men's grooming lounge / premium barbershop" },
    ],
  },
  {
    number: 5,
    name: "Spa, wellness & hospitality",
    subtitle: "Spa, wellness & hospitality",
    categories: [
      { number: 1, label: "Day spa" },
      { number: 2, label: "Hotel, resort or destination spa" },
      { number: 3, label: "Wellness spa, hammam or bathhouse" },
      { number: 4, label: "Massage therapy clinic with skincare add-ons" },
      { number: 5, label: "Gym, fitness studio or recovery lounge with retail" },
      { number: 6, label: "Nail salon or hair salon with skin services" },
    ],
  },
  {
    number: 6,
    name: "Education, retail & trade",
    subtitle: "Education, retail & trade",
    categories: [
      { number: 1, label: "Esthetics school or beauty training academy" },
      { number: 2, label: "Nurse injector or aesthetics training academy" },
      { number: 3, label: "Pharmacy or compounding pharmacy with a cosmeceutical counter" },
      { number: 4, label: "Skincare boutique or clean beauty retailer" },
      { number: 5, label: "Beauty device or electronics retailer" },
      { number: 6, label: "Professional beauty supply retailer" },
      { number: 7, label: "Corporate gifting, concierge or hotel retail buyer" },
    ],
  },
];

export function findTaxonomyLabel(
  segmentNumber: number,
  categoryNumber: number,
): string | null {
  const segment = TAXONOMY.find((s) => s.number === segmentNumber);
  const category = segment?.categories.find((c) => c.number === categoryNumber);
  return category?.label ?? null;
}

export function isInTaxonomy(segmentNumber: number, categoryNumber: number): boolean {
  return findTaxonomyLabel(segmentNumber, categoryNumber) !== null;
}
