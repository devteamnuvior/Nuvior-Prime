/**
 * Response security headers. Imported by next.config.ts.
 *
 * Geolocation is same-origin only — never `geolocation=()` (blocks the
 * opt-in "Use my location" button) and never `geolocation=*` (any origin).
 */
export const PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(self)";

export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
];
