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
import type { GeoPoint } from "@/domain/geo";
import { prefersReducedMotion } from "@/lib/motion";
import type { MapStop, RouteMapCommonProps } from "./mapTypes";
import { buildExternalRouteUrl } from "./mapTypes";
import { GoogleRouteLayers } from "./GoogleRouteLayers";

const ACCENT = "#14594f";
const SIGNAL = "#8a5a1c";

/**
 * Production rep-facing map — Google Maps JavaScript API via
 * @vis.gl/react-google-maps (modern importLibrary-based loader).
 * Must be rendered inside <APIProvider>.
 */
export default function GoogleRouteMap(props: RouteMapCommonProps & { mapId: string }) {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-canvas">
        <div className="max-w-xs rounded-xl border border-rule bg-panel px-5 py-4 text-center shadow-card">
          <p className="text-sm font-semibold text-ink">Map unavailable</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Google Maps could not load. Your itinerary and route details remain available in the
            panel.
          </p>
        </div>
      </div>
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
    <div className="relative h-full w-full" style={crosshair ? { cursor: "crosshair" } : undefined}>
      <GoogleMap
        mapId={mapId}
        defaultCenter={start ?? fallbackCenter}
        defaultZoom={start ? 12 : 10}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        className="h-full w-full"
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
      <div className="absolute top-3 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-rule bg-panel shadow-card">
        <MapButton label="Zoom in" onClick={() => map?.setZoom((map.getZoom() ?? 12) + 1)}>
          +
        </MapButton>
        <MapButton label="Zoom out" onClick={() => map?.setZoom((map.getZoom() ?? 12) - 1)}>
          −
        </MapButton>
        <div className="border-t border-rule-soft" />
        <MapButton label="Fit route" onClick={fitRoute}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 3H4v5M15 3h5v5M9 21H4v-5M15 21h5v-5" />
          </svg>
        </MapButton>
        <MapButton
          label="Center on start"
          onClick={() => {
            const target = start ?? fallbackCenter;
            map?.panTo(target);
            if ((map?.getZoom() ?? 0) < 12) map?.setZoom(12);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
          </svg>
        </MapButton>
        {externalUrl && (
          <>
            <div className="border-t border-rule-soft" />
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              title="Open in Google Maps"
              className="flex h-10 w-10 items-center justify-center text-muted hover:bg-canvas hover:text-ink"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4h6v6M20 4 10 14M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" />
              </svg>
            </a>
          </>
        )}
      </div>

      {/* Honesty caption when showing schematic instead of road geometry */}
      {!geometrySegments && ordered.length > 0 && (
        <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-rule bg-panel/90 px-3 py-1 text-[0.66rem] font-medium text-muted shadow-card">
          Planned sequence — mock path, not a road route
        </div>
      )}
    </div>
  );
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

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center text-[15px] text-muted hover:bg-canvas hover:text-ink"
    >
      {children}
    </button>
  );
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
          strokeColor: "#FAF9F6",
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
