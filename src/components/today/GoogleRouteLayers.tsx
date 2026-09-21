"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { GeoPoint } from "@/domain/geo";
import {
  activeLegIndex,
  buildRouteLegs,
  gradientBands,
  pathPrefix,
  roleForLeg,
  type RouteLeg,
} from "@/domain/routing/routeLegs";
import { MOTION, easeOutCubic, prefersReducedMotion } from "@/lib/motion";
import { ACTIVE_GRADIENT, ROUTE_LINE, activeBandColor, strokeForRole } from "./routeLineStyles";
import type { MapStop } from "./mapTypes";

type LegGraphics = {
  casing: google.maps.Polyline | null;
  stroke: google.maps.Polyline;
  bands: google.maps.Polyline[];
};

/**
 * Imperative route overlay. One-time reveal uses setPath — not React state.
 * No traveling symbols. Direction is a static gradient on the active stroke.
 */
export function GoogleRouteLayers({
  start,
  stops,
  selectedId,
  hoveredId,
  geometrySegments,
  onFirstLegSettled,
}: {
  start: GeoPoint | null;
  stops: MapStop[];
  selectedId: string | null;
  hoveredId?: string | null;
  geometrySegments: GeoPoint[][] | null;
  onFirstLegSettled?: (settled: boolean) => void;
}) {
  const map = useMap();
  const graphicsRef = useRef<LegGraphics[]>([]);
  const legsRef = useRef<RouteLeg[]>([]);
  const rafReveal = useRef(0);
  const revealedKey = useRef("");
  const activeRef = useRef(0);

  const ordered = useMemo(() => [...stops].sort((a, b) => a.seq - b.seq), [stops]);
  const routeKey = ordered.map((s) => s.id).join(",");
  const legs = useMemo(
    () => (start && ordered.length > 0 ? buildRouteLegs(start, ordered, geometrySegments) : []),
    [start, ordered, geometrySegments],
  );
  const active = activeLegIndex(ordered, selectedId, hoveredId);

  useEffect(() => {
    legsRef.current = legs;
  }, [legs]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!map || legs.length === 0) {
      clearGraphics(graphicsRef.current);
      graphicsRef.current = [];
      return;
    }

    const reduced = prefersReducedMotion();
    const already = revealedKey.current === routeKey;
    const reveal = !already && !reduced;

    clearGraphics(graphicsRef.current);
    const graphics = legs.map((leg, i) =>
      createLegGraphics(map, leg, roleForLeg(i, 0), reveal && i === 0),
    );
    graphicsRef.current = graphics;

    cancelAnimationFrame(rafReveal.current);
    let cancelled = false;

    if (reveal) {
      onFirstLegSettled?.(false);
      const origin = performance.now();
      const first = legs[0]!;
      const g = graphics[0]!;
      const tick = (now: number) => {
        if (cancelled) return;
        const t = easeOutCubic((now - origin) / MOTION.routeRevealMs);
        const prefix = pathPrefix(first.path, t);
        g.casing?.setPath(prefix);
        g.stroke.setPath(prefix);
        if (t < 1) {
          rafReveal.current = requestAnimationFrame(tick);
          return;
        }
        revealedKey.current = routeKey;
        onFirstLegSettled?.(true);
        applyAllRoles(graphics, legs, activeRef.current);
      };
      rafReveal.current = requestAnimationFrame(tick);
    } else {
      revealedKey.current = routeKey;
      onFirstLegSettled?.(true);
      applyAllRoles(graphics, legs, activeRef.current);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafReveal.current);
      clearGraphics(graphicsRef.current);
      graphicsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routeKey, geometrySegments, start]);

  useEffect(() => {
    if (revealedKey.current !== routeKey) return;
    applyAllRoles(graphicsRef.current, legsRef.current, active);
  }, [active, routeKey]);

  return null;
}

function createLegGraphics(
  map: google.maps.Map,
  leg: RouteLeg,
  role: ReturnType<typeof roleForLeg>,
  hideUntilReveal: boolean,
): LegGraphics {
  const path = hideUntilReveal ? [leg.path[0]!, leg.path[0]!] : leg.path;
  const strokeStyle = strokeForRole(role);
  const casing = new google.maps.Polyline({
    map: role === "active" ? map : null,
    path,
    strokeColor: ROUTE_LINE.casing.color,
    strokeOpacity: ROUTE_LINE.casing.opacity,
    strokeWeight: ROUTE_LINE.casing.weight,
    zIndex: 2,
    clickable: false,
    geodesic: false,
  });
  const stroke = new google.maps.Polyline({
    map,
    path,
    strokeColor: strokeStyle.color,
    strokeOpacity: strokeStyle.opacity,
    strokeWeight: strokeStyle.weight,
    zIndex: role === "active" ? 3 : 1,
    clickable: false,
    geodesic: false,
  });
  const g: LegGraphics = { casing, stroke, bands: [] };
  if (role === "active" && !hideUntilReveal) applyGradientBands(g, path, map);
  return g;
}

function applyAllRoles(graphics: LegGraphics[], currentLegs: RouteLeg[], activeIdx: number) {
  currentLegs.forEach((leg, i) => {
    const g = graphics[i];
    if (!g) return;
    applyRole(g, roleForLeg(i, activeIdx), leg.path);
  });
}

function applyRole(g: LegGraphics, role: ReturnType<typeof roleForLeg>, fullPath: GeoPoint[]) {
  const style = strokeForRole(role);
  const map = g.stroke.getMap() as google.maps.Map | null;
  g.stroke.setOptions({
    strokeColor: style.color,
    strokeOpacity: style.opacity,
    strokeWeight: style.weight,
    zIndex: role === "active" ? 3 : 1,
  });
  g.stroke.setPath(fullPath);
  if (role === "active" && map) {
    g.casing?.setMap(map);
    g.casing?.setPath(fullPath);
    applyGradientBands(g, fullPath, map);
  } else {
    g.casing?.setMap(null);
    clearBands(g);
  }
}

function applyGradientBands(g: LegGraphics, path: GeoPoint[], map: google.maps.Map) {
  if (path.length < 2) {
    clearBands(g);
    return;
  }
  const slices = gradientBands(path, ACTIVE_GRADIENT.bands);
  while (g.bands.length > slices.length) {
    g.bands.pop()?.setMap(null);
  }
  slices.forEach((slice, i) => {
    const t = (i + 0.5) / slices.length;
    const opts = {
      path: slice,
      strokeColor: activeBandColor(t),
      strokeOpacity: 0.9,
      strokeWeight: ROUTE_LINE.activeBase.weight,
      zIndex: 4,
      clickable: false,
      geodesic: false,
    };
    const existing = g.bands[i];
    if (existing) {
      existing.setOptions(opts);
      existing.setMap(map);
    } else {
      g.bands[i] = new google.maps.Polyline({ map, ...opts });
    }
  });
}

function clearBands(g: LegGraphics) {
  for (const line of g.bands) line.setMap(null);
  g.bands = [];
}

function clearGraphics(list: LegGraphics[]) {
  for (const g of list) {
    g.casing?.setMap(null);
    g.stroke.setMap(null);
    clearBands(g);
  }
}
