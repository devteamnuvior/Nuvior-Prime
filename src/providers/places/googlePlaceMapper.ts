import type { RawPlace, FieldProvenance } from "./types";
import { emptyProvenance, unknownContact } from "./types";

const PROVINCE_NAME_TO_CODE: Record<string, string> = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  "nova scotia": "NS",
  "northwest territories": "NT",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
};

export type GooglePlacePayload = {
  id?: string;
  name?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: {
    longText?: string;
    shortText?: string;
    types?: string[];
  }[];
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: unknown;
  types?: string[];
  primaryType?: string;
};

export function parseCanadianAddress(
  formatted: string | undefined,
  components: GooglePlacePayload["addressComponents"],
  fallbackProvince: string,
): {
  streetAddress: string;
  city: string;
  provinceCode: string;
  postalCode: string;
} {
  let streetAddress = unknownContact();
  let city = unknownContact();
  let provinceCode = fallbackProvince;
  let postalCode = unknownContact();

  if (components?.length) {
    const get = (type: string) =>
      components.find((c) => c.types?.includes(type));

    const streetNumber = get("street_number")?.shortText ?? "";
    const route = get("route")?.shortText ?? "";
    const street = `${streetNumber} ${route}`.trim();
    if (street) streetAddress = street;

    const locality =
      get("locality")?.longText ??
      get("sublocality")?.longText ??
      get("postal_town")?.longText;
    if (locality) city = locality;

    const admin = get("administrative_area_level_1");
    if (admin?.shortText && admin.shortText.length === 2) {
      provinceCode = admin.shortText.toUpperCase();
    } else if (admin?.longText) {
      const mapped = PROVINCE_NAME_TO_CODE[admin.longText.toLowerCase()];
      if (mapped) provinceCode = mapped;
    }

    const postal = get("postal_code")?.shortText ?? get("postal_code")?.longText;
    if (postal) postalCode = postal.toUpperCase();
  }

  if (formatted) {
    if (streetAddress === unknownContact()) {
      streetAddress = formatted.split(",")[0]?.trim() || unknownContact();
    }
    const postalMatch = formatted.toUpperCase().match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/);
    if (postalMatch && postalCode === unknownContact()) {
      postalCode = postalMatch[0].replace(/\s+/, " ");
    }
  }

  return { streetAddress, city, provinceCode, postalCode };
}

export function mapGooglePlaceToRawPlace(
  payload: GooglePlacePayload,
  opts: {
    provider: "google";
    provinceCode: string;
    signal: string;
    fetchedAt?: string;
  },
): RawPlace | null {
  const placeId = payload.id ?? payload.name?.replace(/^places\//, "");
  if (!placeId) return null;

  const lat = payload.location?.latitude;
  const lng = payload.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const businessName = payload.displayName?.text?.trim();
  if (!businessName) return null;

  const fetchedAt = opts.fetchedAt ?? new Date().toISOString();
  const parsed = parseCanadianAddress(
    payload.formattedAddress,
    payload.addressComponents,
    opts.provinceCode,
  );

  const mapsUrl =
    payload.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  const phone =
    payload.nationalPhoneNumber ??
    payload.internationalPhoneNumber ??
    unknownContact();

  const prov = (field: string, needsVerification: boolean, confidence: FieldProvenance["confidence"] = "medium"): FieldProvenance => ({
    ...emptyProvenance("google", placeId, needsVerification),
    fetchedAt,
    sourceUrl: mapsUrl,
    confidence,
  });

  return {
    placeId,
    businessName,
    streetAddress: parsed.streetAddress,
    unitSuite: null,
    city: parsed.city,
    provinceCode: parsed.provinceCode,
    postalCode: parsed.postalCode,
    latitude: lat,
    longitude: lng,
    googleMapsUrl: mapsUrl,
    mainPhone: phone,
    website: payload.websiteUri ?? null,
    googleRating: typeof payload.rating === "number" ? payload.rating : null,
    googleReviewCount:
      typeof payload.userRatingCount === "number" ? payload.userRatingCount : null,
    openingHoursJson: payload.regularOpeningHours ?? null,
    googleTypes: payload.types ?? [],
    primaryType: payload.primaryType ?? null,
    discoverySignals: [opts.signal],
    provider: "google",
    fetchedAt,
    fieldProvenance: {
      businessName: prov("businessName", false, "high"),
      streetAddress: prov("streetAddress", parsed.streetAddress === unknownContact(), "medium"),
      city: prov("city", parsed.city === unknownContact(), "medium"),
      provinceCode: prov("provinceCode", false, "high"),
      postalCode: prov("postalCode", parsed.postalCode === unknownContact(), "medium"),
      latitude: prov("latitude", false, "high"),
      longitude: prov("longitude", false, "high"),
      mainPhone: prov("mainPhone", phone === unknownContact(), phone === unknownContact() ? "low" : "medium"),
      website: prov("website", !payload.websiteUri, payload.websiteUri ? "medium" : "low"),
      googleRating: prov("googleRating", payload.rating == null, "medium"),
      googleReviewCount: prov("googleReviewCount", payload.userRatingCount == null, "medium"),
      openingHoursJson: prov("openingHoursJson", !payload.regularOpeningHours, "medium"),
      googleTypes: prov("googleTypes", false, "high"),
    },
  };
}
