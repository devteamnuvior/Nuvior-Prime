/**
 * Explicit field ownership — CRM truth never overwritten by web.
 */

export type FieldOwner = "crm" | "places" | "website" | "derived" | "manual";

export const FIELD_OWNERSHIP: Record<string, FieldOwner> = {
  doNotContact: "crm",
  lastOrderDate: "crm",
  hasAcademyAccount: "crm",
  aptosCertificationLevel: "crm",
  aptosPathway: "crm",
  staffEligibleFor4Level: "crm",
  formerMesoesteticCustomer: "crm",
  mesoesteticRetentionFlag: "crm",
  lastVisitDate: "crm",
  nextRevisitDueDate: "crm",
  visitNotes: "crm",
  assignedRep: "crm",
  crmExternalId: "crm",
  historicalProductInterest: "crm",

  placeId: "places",
  googleRating: "places",
  googleReviewCount: "places",
  streetAddress: "places",
  mainPhone: "places",
  openingHoursJson: "places",
  googleMapsUrl: "places",

  injectablesOffered: "website",
  threadsOffered: "website",
  skincareLines: "website",
  devicesOnSite: "website",
  people: "website",
  serviceMenuSummary: "website",

  taxonomy: "derived",
  fitScore: "derived",
  recommendedLeadProduct: "derived",
  certificationPathwayFit: "derived",
  openingAngle: "derived",
  lastOrderStatus: "derived",
};

export type OwnedValue = {
  field: string;
  value: unknown;
  owner: FieldOwner;
  conflictWith?: { owner: FieldOwner; value: unknown };
};

export function ownershipOf(field: string): FieldOwner {
  return FIELD_OWNERSHIP[field] ?? "manual";
}
