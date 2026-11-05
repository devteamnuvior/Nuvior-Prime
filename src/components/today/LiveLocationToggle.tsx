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

const STORAGE_KEY = "nuvior.live.share";

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

/**
 * "Share live location" — opt-in. Once the rep turns it on, the browser's
 * watchPosition feeds /api/positions every few seconds so managers see them on
 * the live map. The choice is remembered per browser and resumed on the next
 * visit (the rep already granted the permission); nothing is requested before
 * the first explicit click.
 */
export function LiveLocationToggle() {
  const [sharing, setSharing] = useState(false);
  const [ready, setReady] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);
  const pending = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (watchId.current != null && typeof navigator !== "undefined") navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
    pending.current?.abort();
  }, []);

  const send = useCallback(async (pos: GeolocationPosition) => {
    const now = Date.now();
    if (now - lastSent.current < REPORT_INTERVAL_MS) return;
    lastSent.current = now;
    pending.current?.abort();
    const ctrl = new AbortController();
    pending.current = ctrl;
    const c = pos.coords;
    try {
      await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          lat: c.latitude,
          lng: c.longitude,
          accuracyM: c.accuracy ?? null,
          headingDeg: c.heading != null && !Number.isNaN(c.heading) ? c.heading : null,
          speedMps: c.speed != null && !Number.isNaN(c.speed) ? c.speed : null,
          recordedAt: new Date(pos.timestamp).toISOString(),
        }),
      });
    } catch {
      /* transient — the next fix retries */
    }
  }, []);

  const start = useCallback(() => {
    const geo = typeof navigator !== "undefined" ? navigator.geolocation : null;
    const embedded = isEmbeddedDocument(typeof window !== "undefined" ? window : null);
    const policyAllowed = geolocationAllowedByDocumentPolicy(typeof document !== "undefined" ? (document as unknown as Parameters<typeof geolocationAllowedByDocumentPolicy>[0]) : null);
    if (!geo || policyAllowed === false) {
      toast.error(messageForGeolocationFailure(!geo ? "unavailable" : embedded ? "iframe-blocked" : "policy-blocked"));
      setSharing(false);
      return;
    }
    stop();
    lastSent.current = 0;
    watchId.current = geo.watchPosition(
      (pos) => void send(pos),
      (err) => {
        toast.error(messageForGeolocationFailure(classifyPositionError(err.code, { policyAllowed, embedded })));
        stop();
        setSharing(false);
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      },
      { enableHighAccuracy: true, maximumAge: REPORT_INTERVAL_MS, timeout: 30_000 },
    );
  }, [send, stop]);

  // Resume a previously enabled share; never start on a fresh browser.
  useEffect(() => {
    try {
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
    <Tooltip title={sharing ? "Your position is shared with your admin while this page is open. Click to stop." : "Share your live position with your admin while you work today."}>
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
