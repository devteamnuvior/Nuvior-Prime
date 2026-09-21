import type { CrmAccountStatus, CrmVisitHistoryItem } from "./types";

/**
 * Synthetic CRM fixtures — not real NUVIOR customers.
 * Covers exact/fuzzy/DNC/cert/Meso/order/revisit scenarios for Phase 4.
 */

const md = {
  hasPhysicianOrNp: true,
  hasRn: false,
  hasNd: false,
  hasImg: false,
  hasAllied: false,
  physicianOrNpOnSiteForPrp: true,
  rnHasPhysicianDirective: false,
};

const mdRn = {
  ...md,
  hasRn: true,
  rnHasPhysicianDirective: true,
};

function base(
  partial: Partial<CrmAccountStatus> &
    Pick<CrmAccountStatus, "crmExternalId" | "businessName">,
): CrmAccountStatus {
  return {
    placeId: null,
    streetAddress: null,
    city: null,
    provinceCode: "ON",
    postalCode: null,
    phone: null,
    email: null,
    websiteDomain: null,
    assignedRep: "rep.mock",
    internalStatus: "active_prospect",
    hasAcademyAccount: false,
    aptosCertificationLevel: null,
    aptosPathway: "NONE",
    staffEligibleFor4Level: null,
    formerMesoesteticCustomer: false,
    mesoesteticRetentionFlag: false,
    lastOrderDate: null,
    doNotContact: false,
    dncVerified: true,
    lastVisitDate: null,
    nextRevisitDueDate: null,
    visitNotes: null,
    historicalProductInterest: null,
    credentials: md,
    advertisesThreadLifting: null,
    pricePositioning: "unknown",
    injectablesOffered: "UNKNOWN, verify",
    threadsOffered: "UNKNOWN, verify",
    skincareLines: "UNKNOWN, verify",
    serviceMenuSummary: "UNKNOWN, verify",
    practitioners: [],
    ...partial,
  };
}

/** Today for fixture relative dates — fixed for deterministic tests. */
export const MOCK_CRM_AS_OF = "2026-08-31";

export const MOCK_CRM_ACCOUNTS: CrmAccountStatus[] = [
  // Exact Place ID match — Yorkville
  base({
    crmExternalId: "CRM-MOCK-001",
    placeId: "mock-on-001",
    businessName: "Mock Yorkville Dermatology",
    streetAddress: "MOCK 120 Bloor St W",
    city: "Toronto",
    postalCode: "M5S 1N4",
    phone: "416-555-0101",
    email: "info@mockyorkderm.example",
    websiteDomain: "mockyorkderm.example",
    credentials: mdRn,
    advertisesThreadLifting: true,
    pricePositioning: "premium",
    injectablesOffered: "yes — toxin, filler",
    threadsOffered: "yes — PDO",
    skincareLines: "UNKNOWN, verify",
    serviceMenuSummary: "Medical dermatology + injectables",
    practitioners: [
      { name: "UNKNOWN, verify", credentials: "MD", role: "medical director", performsInjectables: true },
    ],
    lastVisitDate: "2026-07-01",
    nextRevisitDueDate: null,
    historicalProductInterest: "Aptos",
  }),

  // Exact name + postal — King West; academy, no cert yet
  base({
    crmExternalId: "CRM-MOCK-002",
    placeId: "mock-on-002",
    businessName: "Mock King West Cosmetic Medicine",
    streetAddress: "MOCK 560 King St W",
    city: "Toronto",
    postalCode: "M5V 1M3",
    phone: "416-555-0102",
    hasAcademyAccount: true,
    credentials: md,
    pricePositioning: "mid",
    injectablesOffered: "yes",
    threadsOffered: "none advertised",
    lastOrderDate: null,
  }),

  // Harbourfront NP
  base({
    crmExternalId: "CRM-MOCK-003",
    placeId: "mock-on-003",
    businessName: "Mock Harbourfront NP Injectables",
    streetAddress: "MOCK 225 Queens Quay W",
    city: "Toronto",
    postalCode: "M5J 2X1",
    credentials: {
      hasPhysicianOrNp: true,
      hasRn: false,
      hasNd: false,
      hasImg: false,
      hasAllied: false,
      physicianOrNpOnSiteForPrp: true,
      rnHasPhysicianDirective: false,
    },
    pricePositioning: "premium",
    injectablesOffered: "yes",
  }),

  // Sports medicine — active customer
  base({
    crmExternalId: "CRM-MOCK-004",
    placeId: "mock-on-004",
    businessName: "Mock Liberty Sports Medicine",
    streetAddress: "MOCK 171 East Liberty St",
    city: "Toronto",
    postalCode: "M6K 3P6",
    lastOrderDate: "2026-08-01",
    historicalProductInterest: "Fidia Hy-tissue PRP",
    credentials: md,
    injectablesOffered: "yes — PRP",
  }),

  // MedSpa — dormant order, revisit due
  base({
    crmExternalId: "CRM-MOCK-005",
    placeId: "mock-on-005",
    businessName: "Mock Queen West MedSpa",
    streetAddress: "MOCK 650 Queen St W",
    city: "Toronto",
    postalCode: "M6J 1E5",
    credentials: mdRn,
    lastOrderDate: "2026-02-15",
    lastVisitDate: "2026-03-01",
    nextRevisitDueDate: "2026-08-31",
    visitNotes: "Discussed peels; follow up on Dermaceutic",
    historicalProductInterest: "Dermaceutic",
  }),

  // RN studio — 4-level eligible, partially certified
  base({
    crmExternalId: "CRM-MOCK-006",
    placeId: "mock-on-006",
    businessName: "Mock RN Injector Studio Annex",
    streetAddress: "MOCK 480 Bloor St W",
    city: "Toronto",
    postalCode: "M5S 1X8",
    hasAcademyAccount: true,
    aptosPathway: "FOUR_LEVEL",
    aptosCertificationLevel: "2/4 Practitioner",
    staffEligibleFor4Level: "RNs",
    credentials: {
      hasPhysicianOrNp: false,
      hasRn: true,
      hasNd: false,
      hasImg: false,
      hasAllied: false,
      physicianOrNpOnSiteForPrp: false,
      rnHasPhysicianDirective: false,
    },
    advertisesThreadLifting: true,
    threadsOffered: "PDO advertised",
  }),

  // Pigment — no Place ID link initially (name+postal match)
  base({
    crmExternalId: "CRM-MOCK-007",
    placeId: null,
    businessName: "Mock Pigment Lab Skin Studio",
    streetAddress: "MOCK 790 Dundas St W",
    city: "Toronto",
    postalCode: "M6J 1V1",
    credentials: {
      hasPhysicianOrNp: false,
      hasRn: false,
      hasNd: false,
      hasImg: false,
      hasAllied: false,
      physicianOrNpOnSiteForPrp: false,
      rnHasPhysicianDirective: false,
    },
  }),

  // DNC — must never appear as prospect
  base({
    crmExternalId: "CRM-MOCK-DNC",
    placeId: "mock-on-011",
    businessName: "Mock Do-Not-Contact Demo Clinic",
    streetAddress: "MOCK 1 Test DNC Ave",
    city: "Toronto",
    postalCode: "M5V 0A1",
    doNotContact: true,
    internalStatus: "do_not_contact",
    credentials: md,
  }),

  // Former Mesoestetic + retention
  base({
    crmExternalId: "CRM-MOCK-MESO",
    placeId: "mock-on-012",
    businessName: "Mock Former Mesoestetic Skin Lab",
    streetAddress: "MOCK 33 Elm St",
    city: "Toronto",
    postalCode: "M5G 1H1",
    formerMesoesteticCustomer: true,
    mesoesteticRetentionFlag: true,
    lastOrderDate: "2024-11-01",
    hasAcademyAccount: true,
    credentials: mdRn,
    historicalProductInterest: "Mesoestetic (historical)",
  }),

  // Fully certified Aptos 3-level physician account (Coal Harbour mapped by name for BC)
  base({
    crmExternalId: "CRM-MOCK-BC-002",
    placeId: "mock-bc-002",
    businessName: "Mock Coal Harbour Plastic Surgery",
    streetAddress: "MOCK 555 W Cordova St",
    city: "Vancouver",
    provinceCode: "BC",
    postalCode: "V6B 1G1",
    hasAcademyAccount: true,
    aptosPathway: "THREE_LEVEL",
    aptosCertificationLevel: "3/3 Online Certification",
    lastOrderDate: "2025-06-15",
    credentials: mdRn,
    advertisesThreadLifting: true,
    threadsOffered: "yes — threads offered",
  }),

  // Long-lapsed customer — Midtown hair (exact place)
  base({
    crmExternalId: "CRM-MOCK-010",
    placeId: "mock-on-010",
    businessName: "Mock Midtown Hair Restoration",
    streetAddress: "MOCK 2300 Yonge St",
    city: "Toronto",
    postalCode: "M4P 1E4",
    lastOrderDate: "2023-01-10",
    lastVisitDate: "2023-02-01",
    nextRevisitDueDate: null,
    credentials: md,
    injectablesOffered: "yes — PRP hair",
  }),

  // Already visited / not due — Distillery spa
  base({
    crmExternalId: "CRM-MOCK-008",
    placeId: "mock-on-008",
    businessName: "Mock Distillery Day Spa",
    streetAddress: "MOCK 55 Mill St",
    city: "Toronto",
    postalCode: "M5A 3C4",
    lastVisitDate: "2026-08-20",
    nextRevisitDueDate: "2026-10-01",
    credentials: {
      hasPhysicianOrNp: false,
      hasRn: false,
      hasNd: false,
      hasImg: false,
      hasAllied: false,
      physicianOrNpOnSiteForPrp: false,
      rnHasPhysicianDirective: false,
    },
  }),

  // Fuzzy / possible match target — similar name, different postal (conflict risk)
  base({
    crmExternalId: "CRM-MOCK-FUZZY-YORK",
    placeId: null,
    businessName: "Yorkville Dermatology Clinic",
    streetAddress: "200 Avenue Rd",
    city: "Toronto",
    postalCode: "M5R 2J3",
    phone: "416-555-0999",
    credentials: md,
  }),

  // Address conflict fixture for unit tests (not linked to live Place IDs)
  base({
    crmExternalId: "CRM-MOCK-CONFLICT-ADDR",
    placeId: "mock-conflict-demo",
    businessName: "Mock Yorkville Dermatology",
    streetAddress: "999 Wrong St",
    city: "Toronto",
    postalCode: "M5S 9Z9",
    credentials: md,
    internalStatus: "duplicate_suspect",
  }),

  // Calgary exact
  base({
    crmExternalId: "CRM-MOCK-AB-001",
    placeId: "mock-ab-001",
    businessName: "Mock Kensington Cosmetic MD",
    streetAddress: "MOCK 1124 Kensington Rd NW",
    city: "Calgary",
    provinceCode: "AB",
    postalCode: "T2N 3P3",
    credentials: md,
    advertisesThreadLifting: true,
  }),

  // BC ND
  base({
    crmExternalId: "CRM-MOCK-BC-001",
    placeId: "mock-bc-001",
    businessName: "Mock Yaletown ND Aesthetics",
    streetAddress: "MOCK 1080 Mainland St",
    city: "Vancouver",
    provinceCode: "BC",
    postalCode: "V6B 2T4",
    staffEligibleFor4Level: "NDs in BC",
    credentials: {
      hasPhysicianOrNp: false,
      hasRn: false,
      hasNd: true,
      hasImg: false,
      hasAllied: false,
      physicianOrNpOnSiteForPrp: false,
      rnHasPhysicianDirective: false,
    },
  }),
];

export const MOCK_CRM_VISIT_HISTORY: Record<string, CrmVisitHistoryItem[]> = {
  "CRM-MOCK-005": [
    {
      visitDate: "2026-03-01",
      visitType: "re-visit",
      outcome: "interested",
      notes: "Discussed peels",
      peopleMet: "Clinic manager",
      productsDiscussed: "Dermaceutic",
    },
  ],
  "CRM-MOCK-001": [
    {
      visitDate: "2026-07-01",
      visitType: "first visit",
      outcome: "follow_up",
      notes: "Thread interest",
      peopleMet: "Medical director",
      productsDiscussed: "Aptos",
    },
  ],
};

/** @deprecated alias — prefer MOCK_CRM_ACCOUNTS */
export const MOCK_CRM_STATUSES = MOCK_CRM_ACCOUNTS;
