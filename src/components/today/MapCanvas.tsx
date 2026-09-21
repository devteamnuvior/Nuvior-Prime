"use client";

import dynamic from "next/dynamic";
import { getBrowserMapsConfig } from "@/lib/mapsConfig";
import type { RouteMapCommonProps } from "./mapTypes";

const GoogleRouteMap = dynamic(() => import("./GoogleRouteMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-canvas" />,
});

const FallbackRouteMap = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-canvas" />,
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
      <div className="relative h-full w-full">
        <GoogleRouteMap {...props} mapId={cfg.mapId} />
        <div className="absolute bottom-3 left-3 z-[1000] rounded-full bg-signal px-3 py-1 text-[0.66rem] font-semibold tracking-wide text-white uppercase shadow-card">
          Google Demo — not production
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <FallbackRouteMap {...props} />
      <div className="absolute bottom-3 left-3 z-[1000] rounded-full bg-signal px-3 py-1 text-[0.66rem] font-semibold tracking-wide text-white uppercase shadow-card">
        Fallback map — not Google
      </div>
    </div>
  );
}
