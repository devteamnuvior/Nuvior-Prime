"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  APILoadingStatus,
  Map as GoogleMap,
  useApiLoadingStatus,
  useMap,
} from "@vis.gl/react-google-maps";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { GeoPoint } from "@/domain/geo";
import { prefersReducedMotion } from "@/lib/motion";
import { amber, neutral, teal } from "@/theme/tokens";
import type { MapStop, RouteMapCommonProps } from "./mapTypes";
import { buildExternalRouteUrl } from "./mapTypes";
import { GoogleRouteLayers } from "./GoogleRouteLayers";
import { MapCaption, MapControls } from "./mapChrome";

/* Google overlays take literal colours — read them from the design tokens, not the DOM. */
const ACCENT = teal[600];
const SIGNAL = amber[600];
const CASING = neutral[50];

/**
 * Production rep-facing map — Google Maps JavaScript API via
 * @vis.gl/react-google-maps (modern importLibrary-based loader).
 * Must be rendered inside <APIProvider>.
 */
export default function GoogleRouteMap(props: RouteMapCommonProps & { mapId: string }) {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <Box sx={{ display: "flex", width: 1, height: 1, alignItems: "center", justifyContent: "center", bgcolor: "background.sunken" }}>
        <Paper variant="outlined" sx={{ maxWidth: 320, px: 5, py: 4, textAlign: "center", borderRadius: 1.5, boxShadow: 1 }}>
          <Typography variant="h4" component="p">
            Map unavailable
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary", lineHeight: 1.6 }}>
            Google Maps could not load. Your itinerary and route details remain available in the
            panel.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return <LoadedMap {...props} />;
}

function LoadedMap({
  start,
  stops,
  selectedId,
  onSelect,
  fallbackCenter,
  geometrySegments,
  interaction,
  onMapClick,
  draftArea,
  onDraftClose,
  workingArea,
  onWorkingAreaEdited,
  hoveredId,
  onHover,
  candidates = [],
  visited = [],
  mapId,
}: RouteMapCommonProps & { mapId: string }) {
  const drawing = interaction !== "none";
  const map = useMap();
  const ordered = useMemo(() => [...stops].sort((a, b) => a.seq - b.seq), [stops]);
  const [firstLegSettled, setFirstLegSettled] = useState(() => prefersReducedMotion());
  const skipLegFit = useRef(true);

  const fitRoute = () => {
    if (!map || (ordered.length === 0 && !start)) return;
    const bounds = new google.maps.LatLngBounds();
    if (start) bounds.extend(start);
    for (const s of ordered) bounds.extend({ lat: s.lat, lng: s.lng });
    if (geometrySegments) {
      for (const seg of geometrySegments) for (const p of seg) bounds.extend(p);
    }
    map.fitBounds(bounds, 56);
  };

  // Fit when a new route arrives.
  const routeKey = ordered.map((s) => s.id).join(",");
  useEffect(() => {
    if (ordered.length > 0) {
      skipLegFit.current = true;
      setFirstLegSettled(prefersReducedMotion());
      fitRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, map]);

  // Fit the travel leg that belongs to the selected stop (previous → selected).
  useEffect(() => {
    if (!map || !selectedId || ordered.length === 0) return;
    if (skipLegFit.current) {
      skipLegFit.current = false;
      return;
    }
    const idx = ordered.findIndex((s) => s.id === selectedId);
    if (idx < 0) return;
    const curr = ordered[idx]!;
    const prev = idx === 0 ? start : ordered[idx - 1];
    const bounds = new google.maps.LatLngBounds();
    if (prev) bounds.extend(prev);
    bounds.extend({ lat: curr.lat, lng: curr.lng });
    map.fitBounds(bounds, 96);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, map]);

  const externalUrl = buildExternalRouteUrl(start, ordered);
  const crosshair = interaction === "set-start" || interaction === "draw-area";

  return (
    <Box sx={{ position: "relative", width: 1, height: 1, cursor: crosshair ? "crosshair" : undefined }}>
      <GoogleMap
        mapId={mapId}
        defaultCenter={start ?? fallbackCenter}
        defaultZoom={start ? 12 : 10}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
        onClick={(e) => {
          const ll = e.detail.latLng;
          if (ll && onMapClick) onMapClick({ lat: ll.lat, lng: ll.lng });
        }}
      >
        <GoogleRouteLayers
          start={start}
          stops={ordered}
          selectedId={selectedId}
          hoveredId={hoveredId}
          geometrySegments={geometrySegments}
          onFirstLegSettled={setFirstLegSettled}
        />

        {/* Working area (finished, editable) */}
        {workingArea.length >= 3 && (
          <MapPolygon path={workingArea} editable onEdited={onWorkingAreaEdited} />
        )}
        {/* Draft area while drawing: outline + live fill preview once closable */}
        {draftArea.length > 0 && <MapPolyline path={draftArea} variant="draft" />}
        {draftArea.length >= 3 && <MapPolygon path={draftArea} editable={false} preview />}
        {draftArea.map((p, i) => {
          const isFirst = i === 0 && draftArea.length >= 3;
          return (
            <AdvancedMarker
              key={`draft-${i}`}
              position={p}
              anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
              zIndex={isFirst ? 600 : 550}
              onClick={isFirst ? () => onDraftClose?.() : undefined}
            >
              <div
                className={isFirst ? "nv-vertex nv-vertex--first" : "nv-vertex"}
                title={isFirst ? "Close the area" : undefined}
              />
            </AdvancedMarker>
          );
        })}

        {/* Candidate layer — visually subordinate, no numbers, not DNC */}
        {candidates.map((c) => (
          <AdvancedMarker
            key={`cand-${c.id}`}
            position={{ lat: c.lat, lng: c.lng }}
            anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
            zIndex={1}
          >
            <div
              className={`nv-pin nv-pin--candidate ${c.kind === "cluster" ? "nv-pin--cluster" : ""} ${c.kind ? `nv-pin--cand-${c.kind}` : ""}`}
              title={c.kind === "cluster" ? `${c.count} accounts` : c.name}
            >
              {c.kind === "cluster" ? c.count : ""}
            </div>
          </AdvancedMarker>
        ))}

        {/* Already visited by the team — muted check pins, not part of the route */}
        {visited.map((v) => (
          <AdvancedMarker key={`visited-${v.id}`} position={{ lat: v.lat, lng: v.lng }} anchorPoint={AdvancedMarkerAnchorPoint.CENTER} zIndex={2}>
            <div className="nv-pin nv-pin--visited" title={visitedTitle(v)} aria-label={visitedTitle(v)}>
              ✓
            </div>
          </AdvancedMarker>
        ))}

        {/* Start */}
        {start && (
          <AdvancedMarker
            position={start}
            anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
            zIndex={500}
          >
            <div className="nv-pin nv-pin--start">
              <span className="nv-pin__halo" aria-hidden />
              S
            </div>
          </AdvancedMarker>
        )}

        {/* Numbered stops — sequence matches the itinerary exactly */}
        {ordered.map((s) => (
          <AdvancedMarker
            key={s.id}
            position={{ lat: s.lat, lng: s.lng }}
            anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
            zIndex={s.id === selectedId ? 1000 : s.id === hoveredId ? 900 : s.seq}
            onClick={() => {
              if (!drawing) onSelect(s.id);
            }}
            onMouseEnter={() => {
              if (!drawing) onHover?.(s.id);
            }}
            onMouseLeave={() => onHover?.(null)}
          >
            <div
              className={`${pinClass(s, s.id === selectedId, s.id === hoveredId, s.seq === 1 && firstLegSettled)}${drawing ? " nv-pin--inert" : ""}`}
              style={{ "--pin-i": s.seq } as React.CSSProperties}
              role="button"
              aria-label={`Stop ${s.seq}: ${s.name}`}
              title={s.name}
            >
              {s.seq}
            </div>
          </AdvancedMarker>
        ))}
      </GoogleMap>

      {/* Map controls — same visual system as the rest of the app */}
      <MapControls
        onZoomIn={() => map?.setZoom((map.getZoom() ?? 12) + 1)}
        onZoomOut={() => map?.setZoom((map.getZoom() ?? 12) - 1)}
        onFit={fitRoute}
        onCenter={() => {
          const target = start ?? fallbackCenter;
          map?.panTo(target);
          if ((map?.getZoom() ?? 0) < 12) map?.setZoom(12);
        }}
        externalUrl={externalUrl}
      />

      {/* Honesty caption when showing schematic instead of road geometry */}
      {!geometrySegments && ordered.length > 0 && <MapCaption>Planned sequence — mock path, not a road route</MapCaption>}
    </Box>
  );
}

function visitedTitle(v: { name: string; by: string; on: string }): string {
  return `${v.name} — visited by ${v.by} on ${v.on}`;
}

function pinClass(s: MapStop, selected: boolean, hovered: boolean, arrive: boolean): string {
  return [
    "nv-pin",
    "nv-pin-in",
    s.revisit ? "nv-pin--revisit" : "",
    s.warn ? "nv-pin--warn" : "",
    selected ? "nv-pin--selected" : "",
    hovered && !selected ? "nv-pin--hover" : "",
    arrive ? "nv-pin--arrive" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Imperative google.maps.Polyline — vis.gl has no polyline component. */
function MapPolyline({ path, variant }: { path: GeoPoint[]; variant: "road" | "schematic" | "draft" }) {
  const map = useMap();
  useEffect(() => {
    if (!map || path.length < 2) return;
    const lines: google.maps.Polyline[] = [];
    if (variant === "road") {
      // Casing + stroke so the road route reads against any basemap.
      lines.push(
        new google.maps.Polyline({
          map,
          path,
          strokeColor: CASING,
          strokeOpacity: 0.92,
          strokeWeight: 8,
          zIndex: 1,
        }),
        new google.maps.Polyline({
          map,
          path,
          strokeColor: ACCENT,
          strokeOpacity: 0.92,
          strokeWeight: 4,
          zIndex: 2,
        }),
      );
    } else {
      lines.push(
        new google.maps.Polyline({
          map,
          path,
          strokeOpacity: 0,
          zIndex: 1,
          icons: [
            {
              icon: {
                path: "M 0,-0.06 0,0.06",
                strokeOpacity: variant === "draft" ? 0.9 : 0.7,
                strokeColor: variant === "draft" ? SIGNAL : ACCENT,
                strokeWeight: 2.5,
                scale: 3,
              },
              offset: "0",
              repeat: "12px",
            },
          ],
        }),
      );
    }
    return () => lines.forEach((line) => line.setMap(null));
  }, [map, path, variant]);
  return null;
}

/** Imperative polygon — editable working area, or live draft-fill preview. */
function MapPolygon({
  path,
  editable,
  preview = false,
  onEdited,
}: {
  path: GeoPoint[];
  editable: boolean;
  preview?: boolean;
  onEdited?: (points: GeoPoint[]) => void;
}) {
  const map = useMap();
  const suppressRef = useRef(false);

  useEffect(() => {
    if (!map || path.length < 3) return;
    const polygon = new google.maps.Polygon({
      map,
      paths: path,
      editable,
      clickable: !preview,
      strokeColor: ACCENT,
      strokeOpacity: preview ? 0 : 0.8,
      strokeWeight: 2,
      fillColor: ACCENT,
      fillOpacity: preview ? 0.06 : 0.08,
    });

    const emit = () => {
      if (suppressRef.current || !onEdited) return;
      const next = polygon
        .getPath()
        .getArray()
        .map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));
      onEdited(next);
    };
    const p = polygon.getPath();
    const listeners = [
      p.addListener("set_at", emit),
      p.addListener("insert_at", emit),
      p.addListener("remove_at", emit),
    ];
    return () => {
      suppressRef.current = true;
      listeners.forEach((l) => l.remove());
      polygon.setMap(null);
    };
  }, [map, path, editable, preview, onEdited]);
  return null;
}
