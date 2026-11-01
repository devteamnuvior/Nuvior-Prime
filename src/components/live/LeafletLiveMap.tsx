"use client";

/** Emergency fallback live map (Leaflet + CARTO). Rendered only without a Google Maps key. */

import { useEffect, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Box from "@mui/material/Box";
import { MapControls } from "@/components/today/mapChrome";
import type { LiveMapCommonProps, LiveMarker } from "./liveTypes";
import { repMarkerHtml } from "./liveTypes";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const FOCUS_ZOOM = 14;

function repIcon(m: LiveMarker, selected: boolean) {
  return L.divIcon({ className: "", html: repMarkerHtml(m, selected), iconSize: [36, 36], iconAnchor: [18, 18] });
}

function ClickCapture({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick });
  return null;
}

export default function LeafletLiveMap({ markers, selectedId, onSelect, fitNonce, focus, fallbackCenter }: LiveMapCommonProps) {
  const mapRef = useRef<L.Map | null>(null);
  const fitted = useRef(false);

  const fitAll = () => {
    const map = mapRef.current;
    if (!map) return;
    if (markers.length === 0) {
      map.setView([fallbackCenter.lat, fallbackCenter.lng], 4);
      return;
    }
    if (markers.length === 1) {
      map.flyTo([markers[0]!.lat, markers[0]!.lng], FOCUS_ZOOM - 1, { duration: 0.5 });
      return;
    }
    map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])).pad(0.2));
  };

  useEffect(() => {
    if (fitted.current && fitNonce === 0) return;
    if (markers.length === 0 && fitNonce === 0) return;
    fitted.current = true;
    fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitNonce, markers.length > 0]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    const m = markers.find((x) => x.id === focus.id);
    if (!m) return;
    map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  return (
    <Box sx={{ position: "relative", width: 1, height: 1 }}>
      <MapContainer ref={mapRef} center={[fallbackCenter.lat, fallbackCenter.lng]} zoom={4} zoomControl={false} style={{ width: "100%", height: "100%" }}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ClickCapture onClick={() => onSelect(null)} />
        {markers.map((m) => {
          const selected = m.id === selectedId;
          return (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={repIcon(m, selected)}
              zIndexOffset={selected ? 1000 : m.recent ? 500 : 100}
              eventHandlers={{ click: () => onSelect(selected ? null : m.id) }}
            />
          );
        })}
      </MapContainer>
      <MapControls
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onFit={fitAll}
        onCenter={() => {
          const m = markers.find((x) => x.id === selectedId) ?? markers[0];
          const map = mapRef.current;
          if (!m || !map) return;
          map.flyTo([m.lat, m.lng], Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.5 });
        }}
        externalUrl={null}
        fitLabel="Fit everyone"
        centerLabel="Center on selected rep"
      />
    </Box>
  );
}
