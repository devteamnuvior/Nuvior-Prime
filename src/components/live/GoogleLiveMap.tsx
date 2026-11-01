"use client";

import { useEffect, useRef } from "react";
import { AdvancedMarker, AdvancedMarkerAnchorPoint, APILoadingStatus, Map as GoogleMap, useApiLoadingStatus, useMap } from "@vis.gl/react-google-maps";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { MapControls } from "@/components/today/mapChrome";
import type { LiveMapCommonProps } from "./liveTypes";
import { repMarkerClass } from "./liveTypes";

const FOCUS_ZOOM = 14;

/** Admin live map on the Google basemap. Must be rendered inside <APIProvider>. */
export default function GoogleLiveMap(props: LiveMapCommonProps & { mapId: string }) {
  const status = useApiLoadingStatus();
  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <Box sx={{ display: "flex", width: 1, height: 1, alignItems: "center", justifyContent: "center", bgcolor: "background.sunken" }}>
        <Paper variant="outlined" sx={{ maxWidth: 320, px: 5, py: 4, textAlign: "center", borderRadius: 1.5, boxShadow: 1 }}>
          <Typography variant="h4" component="p">
            Map unavailable
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary", lineHeight: 1.6 }}>
            Google Maps could not load. The rep list on the right stays live.
          </Typography>
        </Paper>
      </Box>
    );
  }
  return <LoadedMap {...props} />;
}

function LoadedMap({ markers, selectedId, onSelect, fitNonce, focus, fallbackCenter, mapId }: LiveMapCommonProps & { mapId: string }) {
  const map = useMap();
  const fitted = useRef(false);

  const fitAll = () => {
    if (!map) return;
    if (markers.length === 0) {
      map.panTo(fallbackCenter);
      map.setZoom(4);
      return;
    }
    if (markers.length === 1) {
      map.panTo({ lat: markers[0]!.lat, lng: markers[0]!.lng });
      map.setZoom(FOCUS_ZOOM - 1);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const m of markers) bounds.extend({ lat: m.lat, lng: m.lng });
    map.fitBounds(bounds, 72);
  };

  // Fit once the first positions are in, and whenever the user asks.
  useEffect(() => {
    if (!map) return;
    if (fitted.current && fitNonce === 0) return;
    if (markers.length === 0 && fitNonce === 0) return;
    fitted.current = true;
    fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitNonce, markers.length > 0]);

  useEffect(() => {
    if (!map || !focus) return;
    const m = markers.find((x) => x.id === focus.id);
    if (!m) return;
    map.panTo({ lat: m.lat, lng: m.lng });
    if ((map.getZoom() ?? 0) < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus]);

  return (
    <Box sx={{ position: "relative", width: 1, height: 1 }}>
      <GoogleMap
        mapId={mapId}
        defaultCenter={fallbackCenter}
        defaultZoom={4}
        gestureHandling="greedy"
        disableDefaultUI
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
        onClick={() => onSelect(null)}
      >
        {markers.map((m) => {
          const selected = m.id === selectedId;
          return (
            <AdvancedMarker
              key={m.id}
              position={{ lat: m.lat, lng: m.lng }}
              anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
              zIndex={selected ? 1000 : m.status === "offline" ? 1 : m.recent ? 500 : 100}
              onClick={() => onSelect(selected ? null : m.id)}
            >
              <div className={repMarkerClass(m, selected)} style={{ "--rep-hue": m.hue } as React.CSSProperties} role="button" aria-label={`${m.name}: ${m.clinicName ?? m.status}`} title={m.name}>
                <span className="nv-rep__pulse" aria-hidden />
                <span className="nv-rep__avatar">{m.initials}</span>
                <span className="nv-rep__label">{m.name}</span>
              </div>
            </AdvancedMarker>
          );
        })}
      </GoogleMap>

      <MapControls
        onZoomIn={() => map?.setZoom((map.getZoom() ?? 4) + 1)}
        onZoomOut={() => map?.setZoom((map.getZoom() ?? 4) - 1)}
        onFit={fitAll}
        onCenter={() => {
          const m = markers.find((x) => x.id === selectedId) ?? markers[0];
          if (!m) return;
          map?.panTo({ lat: m.lat, lng: m.lng });
          if ((map?.getZoom() ?? 0) < FOCUS_ZOOM) map?.setZoom(FOCUS_ZOOM);
        }}
        externalUrl={null}
        fitLabel="Fit everyone"
        centerLabel="Center on selected rep"
      />
    </Box>
  );
}
