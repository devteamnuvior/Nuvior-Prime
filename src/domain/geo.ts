/** Great-circle distance helpers. Phase 1 approximates travel radius as km (assumption A1). */

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export type GeoPoint = {
  lat: number;
  lng: number;
};

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function postalCodePrefix(postalCode: string): string {
  const cleaned = postalCode.replace(/\s+/g, "").toUpperCase();
  return cleaned.slice(0, 3);
}
