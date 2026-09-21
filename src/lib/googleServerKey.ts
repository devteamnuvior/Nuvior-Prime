/**
 * Server-only Google credential resolution.
 *
 * NEVER import this module from a client component. It reads secret env names
 * (no NEXT_PUBLIC_ prefix). Browser map config must not call this.
 */

const SERVER_KEY_NAMES = [
  "GOOGLE_MAPS_SERVER_KEY",
  "GOOGLE_PLACES_API_KEY",
  "GOOGLE_ROUTES_API_KEY",
] as const;

/** Preferred: GOOGLE_MAPS_SERVER_KEY, then legacy Places / Routes keys. */
export function resolveGoogleServerKey(
  env: Record<string, string | undefined> = process.env,
): string {
  for (const name of SERVER_KEY_NAMES) {
    const v = env[name]?.trim();
    if (v) return v;
  }
  return "";
}

export function googleServerKeyNames(): readonly string[] {
  return SERVER_KEY_NAMES;
}
