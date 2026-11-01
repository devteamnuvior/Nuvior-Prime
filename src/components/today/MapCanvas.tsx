"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import { getBrowserMapsConfig } from "@/lib/mapsConfig";
import type { RouteMapCommonProps } from "./mapTypes";
import { MapBadge, MapLoading } from "./mapChrome";

const GoogleRouteMap = dynamic(() => import("./GoogleRouteMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});

const FallbackRouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});

/**
 * Renderer priority: Google Live → Google Demo → Leaflet/CARTO fallback.
 * Places/Routes providers are independent of this choice.
 */
export function MapCanvas(props: RouteMapCommonProps) {
  const cfg = getBrowserMapsConfig();

  if (cfg.renderer === "google_live") {
    return <GoogleRouteMap {...props} mapId={cfg.mapId} />;
  }

  if (cfg.renderer === "google_demo") {
    return (
      <Box sx={{ position: "relative", width: 1, height: 1 }}>
        <GoogleRouteMap {...props} mapId={cfg.mapId} />
        <MapBadge>Google Demo — not production</MapBadge>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", width: 1, height: 1 }}>
      <FallbackRouteMap {...props} />
      <MapBadge>Fallback map — not Google</MapBadge>
    </Box>
  );
}
