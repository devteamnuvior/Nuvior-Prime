"use client";

import { useEffect, useState } from "react";
import type { GeoPoint } from "@/domain/geo";
import type { LocationStatus } from "@/domain/visits/checkIn";
import { classifyPositionError, geolocationAllowedByDocumentPolicy, isEmbeddedDocument } from "@/lib/browserGeolocation";

export type RepPosition = GeoPoint & { accuracyM: number | null; at: number };

/**
 * Follows the phone while a plan is on screen so the drawer can tell when the
 * rep has arrived at a stop. Starts only when `enabled`; a denied or missing
 * geolocation leaves `status` explaining why, and the drawer falls back to a
 * manual check-in.
 */
export function useRepPosition(enabled: boolean): { position: RepPosition | null; status: LocationStatus } {
  const [position, setPosition] = useState<RepPosition | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    const geo = typeof navigator !== "undefined" ? navigator.geolocation : null;
    const embedded = isEmbeddedDocument(typeof window !== "undefined" ? window : null);
    const policyAllowed = geolocationAllowedByDocumentPolicy(
      typeof document !== "undefined" ? (document as unknown as Parameters<typeof geolocationAllowedByDocumentPolicy>[0]) : null,
    );
    if (!geo || policyAllowed === false) {
      setStatus("unavailable");
      return;
    }
    setStatus("watching");
    const id = geo.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy ?? null, at: pos.timestamp });
      },
      (err) => {
        const reason = classifyPositionError(err.code, { policyAllowed, embedded });
        setStatus(reason === "denied" ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    return () => geo.clearWatch(id);
  }, [enabled]);

  return { position, status };
}
