"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoPoint } from "@/domain/geo";
import { POLL_INTERVAL_MS, type LiveRepDto } from "@/domain/live/positions";
import { easeOutCubic, prefersReducedMotion } from "@/lib/motion";

export type LiveConnection = "live" | "reconnecting" | "paused";

/**
 * Polls /api/live/reps every POLL_INTERVAL_MS while the tab is visible.
 * Keeps the last good payload on errors and reports the connection state so the
 * header can say "Reconnecting" instead of silently showing stale dots.
 */
export function useLiveReps(initial: LiveRepDto[], provinceCode: string) {
  const [reps, setReps] = useState<LiveRepDto[]>(initial);
  const [fetchedAt, setFetchedAt] = useState<number>(() => Date.now());
  const [connection, setConnection] = useState<LiveConnection>("live");
  const [now, setNow] = useState<number>(() => Date.now());
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    try {
      const res = await fetch(`/api/live/reps?province=${encodeURIComponent(provinceCode)}`, { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { reps: LiveRepDto[] };
      setReps(body.reps);
      setFetchedAt(Date.now());
      setNow(Date.now());
      setConnection("live");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setConnection("reconnecting");
    }
  }, [provinceCode]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      void refresh();
      timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
      inFlight.current?.abort();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
        setConnection("paused");
      } else {
        start();
      }
    };
    if (document.visibilityState !== "hidden") start();
    else setConnection("paused");
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  // A one-second heartbeat so "updated 12 s ago" and the recent-pulse flags re-render.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return { reps, fetchedAt, connection, refresh, now };
}

const TWEEN_MS = 1400;

/**
 * Tweens each rep's drawn position towards its latest fix so markers glide
 * instead of jumping on every poll. Honours prefers-reduced-motion (instant).
 */
export function useAnimatedPositions(targets: Map<string, GeoPoint>): Map<string, GeoPoint> {
  const [display, setDisplay] = useState<Map<string, GeoPoint>>(() => new Map(targets));
  const tweens = useRef<Map<string, { from: GeoPoint; to: GeoPoint; start: number }>>(new Map());
  const frame = useRef<number | null>(null);
  const displayRef = useRef(display);
  displayRef.current = display;

  useEffect(() => {
    const now = performance.now();
    const reduced = prefersReducedMotion();
    const next = new Map(displayRef.current);
    let changed = false;
    for (const [id, to] of targets) {
      const cur = next.get(id);
      if (!cur) {
        next.set(id, to);
        changed = true;
        continue;
      }
      if (cur.lat === to.lat && cur.lng === to.lng) continue;
      if (reduced) {
        next.set(id, to);
        changed = true;
      } else {
        tweens.current.set(id, { from: cur, to, start: now });
      }
    }
    for (const id of next.keys()) {
      if (!targets.has(id)) {
        next.delete(id);
        tweens.current.delete(id);
        changed = true;
      }
    }
    if (changed) setDisplay(next);

    const step = (t: number) => {
      frame.current = null;
      if (tweens.current.size === 0) return;
      const out = new Map(displayRef.current);
      for (const [id, tw] of tweens.current) {
        const k = easeOutCubic((t - tw.start) / TWEEN_MS);
        out.set(id, { lat: tw.from.lat + (tw.to.lat - tw.from.lat) * k, lng: tw.from.lng + (tw.to.lng - tw.from.lng) * k });
        if (k >= 1) tweens.current.delete(id);
      }
      setDisplay(out);
      if (tweens.current.size > 0) frame.current = requestAnimationFrame(step);
    };
    if (tweens.current.size > 0 && frame.current == null) frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [targets]);

  return display;
}
