/**
 * Opt-in browser geolocation. Call only after an explicit "Use my location"
 * click. Address search / Places autocomplete must never import this for
 * a side-effect request — they do not need it.
 */

export const GEOLOCATION_UNAVAILABLE_MESSAGE =
  "Location access isn't available. Search an address or choose a point on the map.";

export const GEOLOCATION_DENIED_MESSAGE =
  "Location access was declined. Search an address or drop a pin instead.";

export const GEOLOCATION_TIMEOUT_MESSAGE =
  "Couldn't get your location in time. Search an address or drop a pin instead.";

export const GEOLOCATION_POLICY_BLOCKED_MESSAGE =
  "This page cannot use your location because a permissions policy blocked it. Open the app directly in the browser (not an embedded preview), then try again — or search / drop a pin.";

export const GEOLOCATION_IFRAME_BLOCKED_MESSAGE =
  "Location isn't available inside an embedded preview. Open this app as a top-level page (for example http://localhost:3003/) or search / drop a pin. A parent iframe must also send allow=\"geolocation\".";

export type GeolocationFailureReason =
  | "unavailable"
  | "denied"
  | "policy-blocked"
  | "iframe-blocked"
  | "timeout";

export type GeolocationRequestResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: GeolocationFailureReason; message: string };

export type GeolocationLike = {
  getCurrentPosition: (
    success: (pos: { coords: { latitude: number; longitude: number } }) => void,
    error?: (err: { code: number; message?: string }) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number },
  ) => void;
};

export type PolicyDocumentLike = {
  featurePolicy?: { allowsFeature: (feature: string) => boolean };
  permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
};

export function isEmbeddedDocument(win: { self: unknown; top: unknown } | null | undefined): boolean {
  if (!win) return false;
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}

export function geolocationAllowedByDocumentPolicy(doc: PolicyDocumentLike | null | undefined): boolean | null {
  if (!doc) return null;
  const policy = doc.permissionsPolicy ?? doc.featurePolicy;
  if (!policy?.allowsFeature) return null;
  try {
    return policy.allowsFeature("geolocation");
  } catch {
    return null;
  }
}

export function messageForGeolocationFailure(reason: GeolocationFailureReason): string {
  switch (reason) {
    case "denied":
      return GEOLOCATION_DENIED_MESSAGE;
    case "policy-blocked":
      return GEOLOCATION_POLICY_BLOCKED_MESSAGE;
    case "iframe-blocked":
      return GEOLOCATION_IFRAME_BLOCKED_MESSAGE;
    case "timeout":
      return GEOLOCATION_TIMEOUT_MESSAGE;
    default:
      return GEOLOCATION_UNAVAILABLE_MESSAGE;
  }
}

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

export function classifyPositionError(
  code: number,
  ctx: { policyAllowed: boolean | null; embedded: boolean },
): GeolocationFailureReason {
  if (code === TIMEOUT) return "timeout";
  if (code === POSITION_UNAVAILABLE) return "unavailable";
  if (code === PERMISSION_DENIED) {
    if (ctx.policyAllowed === false && ctx.embedded) return "iframe-blocked";
    if (ctx.policyAllowed === false) return "policy-blocked";
    if (ctx.embedded && ctx.policyAllowed !== true) return "iframe-blocked";
    return "denied";
  }
  return "unavailable";
}

/**
 * One-shot getCurrentPosition. Never call this on page load or from search.
 */
export function requestBrowserLocation(
  geo: GeolocationLike | null | undefined,
  ctx: {
    document?: PolicyDocumentLike | null;
    window?: { self: unknown; top: unknown } | null;
    timeoutMs?: number;
  } = {},
): Promise<GeolocationRequestResult> {
  const embedded = isEmbeddedDocument(ctx.window ?? (typeof window !== "undefined" ? window : null));
  const policyAllowed = geolocationAllowedByDocumentPolicy(
    ctx.document ??
      (typeof document !== "undefined" ? (document as unknown as PolicyDocumentLike) : null),
  );

  if (policyAllowed === false) {
    const reason: GeolocationFailureReason = embedded ? "iframe-blocked" : "policy-blocked";
    return Promise.resolve({ ok: false, reason, message: messageForGeolocationFailure(reason) });
  }

  if (!geo) {
    return Promise.resolve({
      ok: false,
      reason: "unavailable",
      message: GEOLOCATION_UNAVAILABLE_MESSAGE,
    });
  }

  const timeoutMs = ctx.timeoutMs ?? 10000;

  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (pos) => {
        resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        const reason = classifyPositionError(err.code, { policyAllowed, embedded });
        resolve({ ok: false, reason, message: messageForGeolocationFailure(reason) });
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
