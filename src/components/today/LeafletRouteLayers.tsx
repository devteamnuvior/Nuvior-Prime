"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
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

type LegLine = { casing: L.Polyline | null; stroke: L.Polyline; bands: L.Polyline[] };

export function LeafletRouteLayers({
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
  const linesRef = useRef<LegLine[]>([]);
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
  activeRef.current = active;

  useEffect(() => {
    if (legs.length === 0) return;
    const reduced = prefersReducedMotion();
    const reveal = revealedKey.current !== routeKey && !reduced;

    clearLines(linesRef.current);

    const lines: LegLine[] = legs.map((leg, i) => {
      const role = roleForLeg(i, 0);
      const style = strokeForRole(role);
      const latlngs = toLatLngs(reveal && i === 0 ? [leg.path[0]!, leg.path[0]!] : leg.path);
      const stroke = L.polyline(latlngs, {
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(map);
      const casing =
        role === "active"
          ? L.polyline(latlngs, {
              color: ROUTE_LINE.casing.color,
              weight: ROUTE_LINE.casing.weight,
              opacity: ROUTE_LINE.casing.opacity,
              lineCap: "round",
              lineJoin: "round",
              interactive: false,
            }).addTo(map)
          : null;
      casing?.bringToBack();
      return { casing, stroke, bands: [] };
    });
    linesRef.current = lines;

    cancelAnimationFrame(rafReveal.current);
    if (reveal) {
      onFirstLegSettled?.(false);
      const origin = performance.now();
      const path = legs[0]!.path;
      const tick = (now: number) => {
        const t = easeOutCubic((now - origin) / MOTION.routeRevealMs);
        const prefix = pathPrefix(path, t);
        lines[0]?.stroke.setLatLngs(toLatLngs(prefix));
        lines[0]?.casing?.setLatLngs(toLatLngs(prefix));
        if (t < 1) {
          rafReveal.current = requestAnimationFrame(tick);
          return;
        }
        revealedKey.current = routeKey;
        onFirstLegSettled?.(true);
        restyleLeafletLegs(map, lines, legs, activeRef.current);
      };
      rafReveal.current = requestAnimationFrame(tick);
    } else {
      revealedKey.current = routeKey;
      onFirstLegSettled?.(true);
      restyleLeafletLegs(map, lines, legs, activeRef.current);
    }

    return () => {
      cancelAnimationFrame(rafReveal.current);
      clearLines(linesRef.current);
      linesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, routeKey, start, geometrySegments]);

  useEffect(() => {
    if (revealedKey.current !== routeKey) return;
    restyleLeafletLegs(map, linesRef.current, legs, active);
  }, [active, legs, map, routeKey]);

  return null;
}

function restyleLeafletLegs(map: L.Map, lines: LegLine[], legs: RouteLeg[], active: number) {
  if (lines.length === 0 || legs.length === 0) return;
  legs.forEach((leg, i) => {
    const line = lines[i];
    if (!line) return;
    const role = roleForLeg(i, active);
    const style = strokeForRole(role);
    line.stroke.setStyle({
      color: style.color,
      weight: style.weight,
      opacity: style.opacity,
      lineCap: "round",
      lineJoin: "round",
    });
    line.stroke.setLatLngs(toLatLngs(leg.path));
    if (role === "active") {
      if (!line.casing) {
        line.casing = L.polyline(toLatLngs(leg.path), {
          color: ROUTE_LINE.casing.color,
          weight: ROUTE_LINE.casing.weight,
          opacity: ROUTE_LINE.casing.opacity,
          lineCap: "round",
          lineJoin: "round",
          interactive: false,
        }).addTo(map);
      } else {
        line.casing.setLatLngs(toLatLngs(leg.path));
        line.casing.addTo(map);
      }
      line.casing.bringToBack();
      paintLeafletBands(map, line, leg.path);
    } else {
      line.casing?.remove();
      clearLeafletBands(line);
    }
  });
}

function paintLeafletBands(map: L.Map, line: LegLine, path: GeoPoint[]) {
  if (path.length < 2) {
    clearLeafletBands(line);
    return;
  }
  const slices = gradientBands(path, ACTIVE_GRADIENT.bands);
  while (line.bands.length > slices.length) {
    line.bands.pop()?.remove();
  }
  slices.forEach((slice, i) => {
    const color = activeBandColor((i + 0.5) / slices.length);
    const latlngs = toLatLngs(slice);
    const existing = line.bands[i];
    if (existing) {
      existing.setLatLngs(latlngs);
      existing.setStyle({
        color,
        weight: ROUTE_LINE.activeBase.weight,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      });
      existing.addTo(map);
    } else {
      line.bands[i] = L.polyline(latlngs, {
        color,
        weight: ROUTE_LINE.activeBase.weight,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(map);
    }
  });
}

function clearLeafletBands(line: LegLine) {
  for (const b of line.bands) b.remove();
  line.bands = [];
}

function clearLines(lines: LegLine[]) {
  for (const line of lines) {
    line.casing?.remove();
    line.stroke.remove();
    clearLeafletBands(line);
  }
}

function toLatLngs(path: GeoPoint[]): L.LatLngExpression[] {
  return path.map((p) => [p.lat, p.lng]);
}
