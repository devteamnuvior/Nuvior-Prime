"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import { getBrowserMapsConfig } from "@/lib/mapsConfig";
import { MapBadge, MapLoading } from "@/components/today/mapChrome";
import type { LiveMapCommonProps } from "./liveTypes";

const GoogleLiveMap = dynamic(() => import("./GoogleLiveMap"), { ssr: false, loading: () => <MapLoading /> });
const LeafletLiveMap = dynamic(() => import("./LeafletLiveMap"), { ssr: false, loading: () => <MapLoading /> });

/** Same renderer priority as Today's Route: Google Live → Google Demo → Leaflet/CARTO fallback. */
export function LiveMapCanvas(props: LiveMapCommonProps) {
  const cfg = getBrowserMapsConfig();
  if (cfg.renderer === "google_live") return <GoogleLiveMap {...props} mapId={cfg.mapId} />;
  if (cfg.renderer === "google_demo") {
    return (
      <Box sx={{ position: "relative", width: 1, height: 1 }}>
        <GoogleLiveMap {...props} mapId={cfg.mapId} />
        <MapBadge>Google Demo — not production</MapBadge>
      </Box>
    );
  }
  return (
    <Box sx={{ position: "relative", width: 1, height: 1 }}>
      <LeafletLiveMap {...props} />
      <MapBadge>Fallback map — not Google</MapBadge>
    </Box>
  );
}
