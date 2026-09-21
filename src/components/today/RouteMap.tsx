"use client";

/**
 * Emergency fallback map (Leaflet + OSM/CARTO tiles).
 *
 * Rendered only when no usable Google Maps live or demo key is configured.
 * Not the default development map. The Google basemap (live or demo) is
 * GoogleRouteMap.
 */

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Polygon, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteMapCommonProps } from "./mapTypes";
import { buildExternalRouteUrl } from "./mapTypes";
import { LeafletRouteLayers } from "./LeafletRouteLayers";
import { prefersReducedMotion } from "@/lib/motion";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function pinIcon(opts: {
  label: string;
  revisit?: boolean;
  warn?: boolean;
  selected?: boolean;
  hovered?: boolean;
  start?: boolean;
  arrive?: boolean;
  seq?: number;
  title?: string;
  inert?: boolean;
  candidate?: boolean;
  kind?: string;
  count?: number;
}) {
  const cls = [
    "nv-pin",
    opts.candidate ? "nv-pin--candidate" : "",
    opts.kind === "cluster" ? "nv-pin--cluster" : "",
    opts.kind && opts.kind !== "cluster" ? `nv-pin--cand-${opts.kind}` : "",
    opts.start ? "" : opts.candidate ? "" : "nv-pin-in",
    opts.start ? "nv-pin--start" : "",
    opts.arrive ? "nv-pin--arrive" : "",
    opts.revisit ? "nv-pin--revisit" : "",
    opts.warn ? "nv-pin--warn" : "",
    opts.selected ? "nv-pin--selected" : "",
    opts.hovered && !opts.selected ? "nv-pin--hover" : "",
    opts.inert ? "nv-pin--inert" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = opts.seq != null ? ` style="--pin-i:${opts.seq}"` : "";
  const title = opts.title ? ` title="${escapeHtml(opts.title)}"` : "";
  const size = opts.candidate ? 10 : 28;
  return L.divIcon({
    className: "",
    html: `<div class="${cls}"${style}${title}>${opts.start ? '<span class="nv-pin__halo" aria-hidden></span>' : ""}${opts.kind === "cluster" ? String(opts.count ?? "") : opts.candidate ? "" : opts.label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function vertexIcon(first: boolean) {
  const cls = first ? "nv-vertex nv-vertex--first" : "nv-vertex";
  const size = first ? 16 : 12;
  return L.divIcon({
    className: "",
    html: `<div class="${cls}"${first ? ' title="Close the area"' : ""}></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function ClickCapture({ onMapClick }: { onMapClick?: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function RouteMap({
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
  hoveredId,
  onHover,
  candidates = [],
}: RouteMapCommonProps) {
  const mapRef = useRef<L.Map | null>(null);
  const ordered = [...stops].sort((a, b) => a.seq - b.seq);
  const drawing = interaction !== "none";
  const [firstLegSettled, setFirstLegSettled] = useState(() => prefersReducedMotion());
  const skipLegFit = useRef(true);

  const fitRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    const pts: [number, number][] = ordered.map((s) => [s.lat, s.lng]);
    if (start) pts.unshift([start.lat, start.lng]);
    if (pts.length === 0) return;
    map.fitBounds(L.latLngBounds(pts).pad(0.18));
  };

  const centerStart = () => {
    const map = mapRef.current;
    if (!map) return;
    const target = start ?? fallbackCenter;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 12), { duration: 0.5 });
  };

  const routeKey = ordered.map((s) => s.id).join(",");
  useEffect(() => {
    if (ordered.length > 0) {
      skipLegFit.current = true;
      setFirstLegSettled(prefersReducedMotion());
      fitRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    if (skipLegFit.current) {
      skipLegFit.current = false;
      return;
    }
    const idx = ordered.findIndex((s) => s.id === selectedId);
    if (idx < 0) return;
    const curr = ordered[idx]!;
    const prev = idx === 0 ? start : ordered[idx - 1];
    const pts: [number, number][] = [[curr.lat, curr.lng]];
    if (prev) pts.unshift([prev.lat, prev.lng]);
    map.fitBounds(L.latLngBounds(pts).pad(0.35));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const externalUrl = buildExternalRouteUrl(start, ordered);
  const crosshair = interaction === "set-start" || interaction === "draw-area";

  return (
    <div className="relative h-full w-full" style={crosshair ? { cursor: "crosshair" } : undefined}>
      <MapContainer
        ref={mapRef}
        center={[start?.lat ?? fallbackCenter.lat, start?.lng ?? fallbackCenter.lng]}
        zoom={start ? 12 : 10}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ClickCapture onMapClick={onMapClick} />

        <LeafletRouteLayers
          start={start}
          stops={ordered}
          selectedId={selectedId}
          hoveredId={hoveredId}
          geometrySegments={geometrySegments}
          onFirstLegSettled={setFirstLegSettled}
        />

        {workingArea.length >= 3 && (
          <Polygon
            positions={workingArea.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#14594f", weight: 2, opacity: 0.8, fillOpacity: 0.08 }}
          />
        )}
        {draftArea.length > 1 && (
          <Polyline
            positions={draftArea.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#8a5a1c", weight: 2.5, opacity: 0.9, dashArray: "1 7" }}
          />
        )}
        {/* Live fill preview once the draft is closable */}
        {draftArea.length >= 3 && (
          <Polygon
            positions={draftArea.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ stroke: false, fillColor: "#14594f", fillOpacity: 0.06 }}
          />
        )}
        {draftArea.map((p, i) => {
          const isFirst = i === 0 && draftArea.length >= 3;
          return (
            <Marker
              key={`draft-${i}`}
              position={[p.lat, p.lng]}
              icon={vertexIcon(isFirst)}
              zIndexOffset={isFirst ? 600 : 550}
              eventHandlers={isFirst ? { click: () => onDraftClose?.() } : undefined}
            />
          );
        })}

        {candidates.map((c) => (
          <Marker
            key={`cand-${c.id}`}
            position={[c.lat, c.lng]}
            icon={pinIcon({
              label: "",
              candidate: true,
              title: c.kind === "cluster" ? `${c.count} accounts` : c.name,
              kind: c.kind,
              count: c.count,
            })}
            zIndexOffset={1}
          />
        ))}

        {start && (
          <Marker
            position={[start.lat, start.lng]}
            icon={pinIcon({ label: "S", start: true })}
            zIndexOffset={500}
          />
        )}
        {ordered.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={pinIcon({
              label: String(s.seq),
              revisit: s.revisit,
              warn: s.warn,
              selected: s.id === selectedId,
              hovered: s.id === hoveredId,
              arrive: s.seq === 1 && firstLegSettled,
              seq: s.seq,
              title: s.name,
              inert: drawing,
            })}
            zIndexOffset={s.id === selectedId ? 1000 : s.id === hoveredId ? 900 : s.seq}
            eventHandlers={{
              click: () => {
                if (!drawing) onSelect(s.id);
              },
              mouseover: () => {
                if (!drawing) onHover?.(s.id);
              },
              mouseout: () => onHover?.(null),
            }}
          />
        ))}
      </MapContainer>

      <div className="absolute top-3 right-3 z-[1000] flex flex-col overflow-hidden rounded-lg border border-rule bg-panel shadow-card">
        <MapButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          +
        </MapButton>
        <MapButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          −
        </MapButton>
        <div className="border-t border-rule-soft" />
        <MapButton label="Fit route" onClick={fitRoute}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 3H4v5M15 3h5v5M9 21H4v-5M15 21h5v-5" />
          </svg>
        </MapButton>
        <MapButton label="Center on start" onClick={centerStart}>
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

      {!geometrySegments && ordered.length > 0 && (
        <div className="absolute bottom-3 left-1/2 z-[1000] -translate-x-1/2 rounded-full border border-rule bg-panel/90 px-3 py-1 text-[0.66rem] font-medium text-muted shadow-card">
          Planned sequence — mock path, not a road route
        </div>
      )}
    </div>
  );
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
