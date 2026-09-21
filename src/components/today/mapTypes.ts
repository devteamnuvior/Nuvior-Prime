import type { GeoPoint } from "@/domain/geo";

/** A routed stop as rendered on the map — sequence matches the itinerary. */
export type MapStop = {
  id: string;
  seq: number;
  lat: number;
  lng: number;
  name: string;
  revisit: boolean;
  warn: boolean;
};

export type MapCandidate = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  kind?: "prospect" | "nuvior" | "revisit" | "verify" | "cluster";
  count?: number;
};

export type MapInteraction = "none" | "set-start" | "draw-area";

/** Shared contract for the Google map (live or demo) and the Leaflet fallback. */
export type RouteMapCommonProps = {
  start: GeoPoint | null;
  stops: MapStop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Territory center when no route exists yet. */
  fallbackCenter: GeoPoint;
  /** Decoded road geometry segments; null = schematic fallback. */
  geometrySegments: GeoPoint[][] | null;
  /** Current click behavior (drop-pin start / polygon drawing). */
  interaction: MapInteraction;
  onMapClick?: (point: GeoPoint) => void;
  /** In-progress polygon vertices while drawing. */
  draftArea: GeoPoint[];
  /** Clicking the first draft vertex closes the polygon (≥ 3 points). */
  onDraftClose?: () => void;
  /** Finished working-area polygon (editable on Google). */
  workingArea: GeoPoint[];
  onWorkingAreaEdited?: (points: GeoPoint[]) => void;
  /** Stop hovered in the itinerary — mirrored as marker emphasis. */
  hoveredId?: string | null;
  /** Marker hover → itinerary highlight (bidirectional choreography). */
  onHover?: (id: string | null) => void;
  /** Qualified-but-not-routed dots — subordinate to numbered stops. Never DNC. */
  candidates?: MapCandidate[];
};

/** Google Maps directions URL for the whole route (external hand-off). */
export function buildExternalRouteUrl(start: GeoPoint | null, stops: MapStop[]): string | null {
  if (!start || stops.length === 0) return null;
  const ordered = [...stops].sort((a, b) => a.seq - b.seq);
  const last = ordered[ordered.length - 1]!;
  const waypoints = ordered
    .slice(0, -1)
    .slice(0, 9) // Google Maps URL waypoint cap
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");
  const params = new URLSearchParams({
    api: "1",
    origin: `${start.lat},${start.lng}`,
    destination: `${last.lat},${last.lng}`,
    travelmode: "driving",
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
