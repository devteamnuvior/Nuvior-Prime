"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import { keyframes } from "@emotion/react";
import MyLocationOutlined from "@mui/icons-material/MyLocationOutlined";
import LocationDisabledOutlined from "@mui/icons-material/LocationDisabledOutlined";
import { REPORT_INTERVAL_MS } from "@/domain/live/positions";
import { classifyPositionError, geolocationAllowedByDocumentPolicy, isEmbeddedDocument, messageForGeolocationFailure } from "@/lib/browserGeolocation";
import { toast } from "@/components/feedback/toast";
import { isNativeApp, openNativeLocationSettings, watchNativeLocation, type LocationFix } from "@/lib/nativeLocation";

const STORAGE_KEY = "nuvior.live.share";

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

/**
 * "Share live location" — opt-in. Once the rep turns it on, the browser's
 * watchPosition (or, inside the iOS app, the native background watcher)
 * feeds /api/positions every few seconds so admins see them on the live map. The choice is remembered per browser and resumed on the next
 * visit (the rep already granted the permission); nothing is requested before
 * the first explicit click.
 */
export function LiveLocationToggle() {
  const [sharing, setSharing] = useState(false);
  const [ready, setReady] = useState(false);
  const [native, setNative] = useState(false);
  const watchId = useRef<number | null>(null);
  const stopNative = useRef<(() => void) | null>(null);
  // Bumped on every stop so a native watcher that finishes starting after the
  // rep already turned sharing off is removed instead of leaking.
  const generation = useRef(0);
  const lastSent = useRef(0);
  const pending = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    generation.current += 1;
    if (watchId.current != null && typeof navigator !== "undefined") navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
    stopNative.current?.();
    stopNative.current = null;
    pending.current?.abort();
  }, []);

  const send = useCallback(async (fix: LocationFix) => {
    const now = Date.now();
    if (now - lastSent.current < REPORT_INTERVAL_MS) return;
    lastSent.current = now;
    pending.current?.abort();
    const ctrl = new AbortController();
    pending.current = ctrl;
    try {
      await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          lat: fix.lat,
          lng: fix.lng,
          accuracyM: fix.accuracyM,
          headingDeg: fix.headingDeg,
          speedMps: fix.speedMps,
          recordedAt: new Date(fix.recordedAt).toISOString(),
        }),
      });
    } catch {
      /* transient — the next fix retries */
    }
  }, []);

  const fail = useCallback(
    (message: string) => {
      toast.error(message);
      stop();
      setSharing(false);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
    [stop],
  );

  const start = useCallback(() => {
    stop();
    lastSent.current = 0;

    if (native) {
      const gen = generation.current;
      watchNativeLocation(
        (fix) => void send(fix),
        (reason) => {
          if (reason === "denied") {
            fail("Location access is off for Nuvior Prime. In Settings, set Location to \"Always\" so your admin can see you while the phone is locked.");
            openNativeLocationSettings();
          } else {
            fail(messageForGeolocationFailure("unavailable"));
          }
        },
      )
        .then((remove) => {
          if (gen === generation.current) stopNative.current = remove;
          else remove();
        })
        .catch(() => {
          if (gen === generation.current) fail(messageForGeolocationFailure("unavailable"));
        });
      return;
    }

    const geo = typeof navigator !== "undefined" ? navigator.geolocation : null;
    const embedded = isEmbeddedDocument(typeof window !== "undefined" ? window : null);
    const policyAllowed = geolocationAllowedByDocumentPolicy(typeof document !== "undefined" ? (document as unknown as Parameters<typeof geolocationAllowedByDocumentPolicy>[0]) : null);
    if (!geo || policyAllowed === false) {
      toast.error(messageForGeolocationFailure(!geo ? "unavailable" : embedded ? "iframe-blocked" : "policy-blocked"));
      setSharing(false);
      return;
    }
    watchId.current = geo.watchPosition(
      (pos) => {
        const c = pos.coords;
        void send({
          lat: c.latitude,
          lng: c.longitude,
          accuracyM: c.accuracy ?? null,
          headingDeg: c.heading != null && !Number.isNaN(c.heading) ? c.heading : null,
          speedMps: c.speed != null && !Number.isNaN(c.speed) ? c.speed : null,
          recordedAt: pos.timestamp,
        });
      },
      (err) => fail(messageForGeolocationFailure(classifyPositionError(err.code, { policyAllowed, embedded }))),
      { enableHighAccuracy: true, maximumAge: REPORT_INTERVAL_MS, timeout: 30_000 },
    );
  }, [native, send, stop, fail]);

  // Resume a previously enabled share; never start on a fresh browser.
  useEffect(() => {
    try {
      setNative(isNativeApp());
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setSharing(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (sharing) start();
    else stop();
    return stop;
  }, [sharing, ready, start, stop]);

  const toggle = () => {
    const next = !sharing;
    setSharing(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <Tooltip
      title={
        sharing
          ? native
            ? "Your position is shared with your admin, even while the phone is locked. Tap to stop."
            : "Your position is shared with your admin while this page is open. Click to stop."
          : "Share your live position with your admin while you work today."
      }
    >
      <Chip
        clickable
        onClick={toggle}
        size="small"
        aria-pressed={sharing}
        icon={sharing ? <MyLocationOutlined sx={{ fontSize: 16 }} /> : <LocationDisabledOutlined sx={{ fontSize: 16 }} />}
        label={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
            {sharing && <Box component="span" aria-hidden sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "success.main", animation: `${blink} 1.6s ease-in-out infinite`, "@media (prefers-reduced-motion: reduce)": { animation: "none" } }} />}
            {sharing ? "Sharing location" : "Share location"}
          </Box>
        }
        sx={{
          borderRadius: 999,
          fontWeight: 600,
          bgcolor: sharing ? "rgba(var(--nv-palette-success-mainChannel) / 0.12)" : "background.sunken",
          color: sharing ? "success.main" : "text.secondary",
          "& .MuiChip-icon": { color: "inherit" },
        }}
      />
    </Tooltip>
  );
}
