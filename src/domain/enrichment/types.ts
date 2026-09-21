/** Phase 3 enrichment + evidence domain types. */

export type VerificationStateCode =
  | "VERIFIED_SOURCE"
  | "DERIVED"
  | "AMBIGUOUS"
  | "UNKNOWN"
  | "MANUAL_VERIFY"
  | "CONFLICT";

export type EnrichmentSourceType = "places" | "website" | "crm" | "manual" | "mock";

export type EvidenceRecord = {
  fieldPath: string;
  value: string;
  sourceType: EnrichmentSourceType;
  sourceUrl: string | null;
  sourceTitle: string | null;
  snippet: string | null;
  retrievedAt: string;
  confidence: "high" | "medium" | "low";
  verificationState: VerificationStateCode;
  contentHash?: string | null;
};

export type ExtractedPerson = {
  name: string;
  credentials: string;
  role: string;
  performsInjectables: boolean | null;
  evidence: EvidenceRecord;
};

export type EnrichmentFacts = {
  generalEmail: string | null;
  onlineBookingUrl: string | null;
  instagramHandle: string | null;
  linkedinUrl: string | null;
  tiktokHandle: string | null;
  serviceMenuSummary: string | null;
  injectablesOffered: string | null;
  threadsOffered: string | null;
  prpOffered: string | null;
  peelsOffered: string | null;
  microneedlingOffered: string | null;
  devicesOnSite: string | null;
  skincareLines: string | null;
  competitorBrandsVisible: string | null;
  fillerToxinBrands: string | null;
  threadBrands: string | null;
  advertisesThreadLifting: boolean | null;
  yearsInBusiness: string | null;
  expansionSignals: string | null;
  multiLocation: boolean | null;
  people: ExtractedPerson[];
  /** Mesoestetic named on site — competitive/retention signal only, never lead product. */
  mesoesteticMentioned: boolean;
};

export type ResolvedField = {
  fieldPath: string;
  value: string;
  verificationState: VerificationStateCode;
  evidence: EvidenceRecord[];
  conflict: boolean;
};

export type VerificationItem = {
  accountId: string;
  accountName: string;
  fieldPath: string;
  value: string;
  reason: string;
  sourceType: EnrichmentSourceType | "aggregation";
  sourceUrl: string | null;
  status: VerificationStateCode;
  snippet: string | null;
};

export type EnrichmentResult = {
  accountId: string;
  website: string | null;
  facts: EnrichmentFacts;
  evidence: EvidenceRecord[];
  resolved: ResolvedField[];
  verificationItems: VerificationItem[];
  pagesFetched: number;
  cacheHits: number;
  errors: string[];
  skipped: boolean;
  skipReason: string | null;
};
