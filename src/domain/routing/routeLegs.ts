import { haversineKm, type GeoPoint } from "@/domain/geo";

export type RouteLegRole = "completed" | "active" | "future";

export type RouteLeg = {
  /** 0-based index; 0 is START → Stop 01. */
  index: number;
  /** Itinerary sequence of the destination stop (1-based). */
  toSeq: number;
  toId: string;
  /** Vertices on the real road polyline, or a labeled schematic segment. */
  path: GeoPoint[];
  /** True when this path is UI-only (no Routes API geometry). */
  schematic: boolean;
};

/**
 * Flatten provider segments into one polyline. Duplicate join vertices
 * (chained computeRoutes requests) are dropped. Vertices are never smoothed.
 */
export function flattenRouteSegments(segments: GeoPoint[][]): GeoPoint[] {
  const out: GeoPoint[] = [];
  for (const seg of segments) {
    for (const p of seg) {
      const last = out[out.length - 1];
      if (last && last.lat === p.lat && last.lng === p.lng) continue;
      out.push(p);
    }
  }
  return out;
}

function nearestIndexFrom(path: GeoPoint[], target: GeoPoint, from: number): number {
  let best = from;
  let bestD = Infinity;
  for (let i = from; i < path.length; i++) {
    const d = haversineKm(path[i]!, target);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/**
 * Split a road polyline at the nearest vertices to each waypoint.
 * Search is monotonic along the line so legs stay in travel order.
 * No vertex is invented off the provider geometry except a copy of a waypoint
 * when the slice would otherwise be empty (degenerate provider data).
 */
export function splitPolylineAtWaypoints(path: GeoPoint[], waypoints: GeoPoint[]): GeoPoint[][] {
  if (path.length < 2 || waypoints.length < 2) return [];
  const cuts: number[] = [nearestIndexFrom(path, waypoints[0]!, 0)];
  for (let w = 1; w < waypoints.length; w++) {
    cuts.push(nearestIndexFrom(path, waypoints[w]!, cuts[w - 1]!));
  }
  const legs: GeoPoint[][] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    const slice = path.slice(a, b + 1);
    legs.push(slice.length >= 2 ? slice : [waypoints[i]!, waypoints[i + 1]!]);
  }
  return legs;
}

/**
 * Mock/demo connector when no road geometry exists.
 * A single straight segment — no control points or invented bends.
 * Never present as roads.
 */
export function schematicStraight(a: GeoPoint, b: GeoPoint): GeoPoint[] {
  return [a, b];
}

/** Equal-progress slices of a polyline — used for a static gradient on the active leg. */
export function pathSlice(path: GeoPoint[], t0: number, t1: number): GeoPoint[] {
  const from = pathPrefix(path, Math.max(0, t0));
  const to = pathPrefix(path, Math.min(1, t1));
  const head = from[from.length - 1]!;
  const tail = to.slice(Math.max(from.length - 1, 0));
  if (tail.length === 0) return [head, to[to.length - 1] ?? head];
  const first = tail[0]!;
  if (first.lat === head.lat && first.lng === head.lng) return tail.length >= 2 ? tail : [head, tail[0]!];
  return [head, ...tail];
}

export function gradientBands(path: GeoPoint[], count = 3): GeoPoint[][] {
  if (path.length < 2 || count < 1) return [path];
  const overlap = count > 1 ? 0.12 : 0;
  const bands: GeoPoint[][] = [];
  for (let i = 0; i < count; i++) {
    const t0 = Math.max(0, i / count - (i === 0 ? 0 : overlap));
    const t1 = Math.min(1, (i + 1) / count + (i === count - 1 ? 0 : overlap));
    const slice = pathSlice(path, t0, t1);
    if (slice.length >= 2) bands.push(slice);
  }
  return bands.length > 0 ? bands : [path];
}

export function buildRouteLegs(
  start: GeoPoint,
  stops: { id: string; seq: number; lat: number; lng: number }[],
  geometrySegments: GeoPoint[][] | null,
): RouteLeg[] {
  const ordered = [...stops].sort((a, b) => a.seq - b.seq);
  if (ordered.length === 0) return [];
  const waypoints: GeoPoint[] = [start, ...ordered.map((s) => ({ lat: s.lat, lng: s.lng }))];
  const road = geometrySegments ? flattenRouteSegments(geometrySegments) : [];
  const slices = road.length >= 2 ? splitPolylineAtWaypoints(road, waypoints) : null;

  return ordered.map((stop, i) => {
    const from = waypoints[i]!;
    const to = waypoints[i + 1]!;
    const fromRoad = Boolean(slices?.[i] && slices[i]!.length >= 2);
    const path = fromRoad ? slices![i]! : schematicStraight(from, to);
    return {
      index: i,
      toSeq: stop.seq,
      toId: stop.id,
      path,
      schematic: !fromRoad,
    };
  });
}

/** Prefix of a polyline at progress t ∈ [0,1], interpolating only along existing segments. */
export function pathPrefix(path: GeoPoint[], t: number): GeoPoint[] {
  if (path.length === 0) return [];
  if (t <= 0) return [path[0]!];
  if (t >= 1 || path.length === 1) return path;
  const dists = [0];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineKm(path[i - 1]!, path[i]!);
    dists.push(total);
  }
  if (total === 0) return [path[0]!];
  const target = t * total;
  for (let i = 1; i < path.length; i++) {
    if (dists[i]! >= target) {
      const span = dists[i]! - dists[i - 1]!;
      const u = span === 0 ? 1 : (target - dists[i - 1]!) / span;
      const a = path[i - 1]!;
      const b = path[i]!;
      return [...path.slice(0, i), { lat: a.lat + (b.lat - a.lat) * u, lng: a.lng + (b.lng - a.lng) * u }];
    }
  }
  return path;
}

/** Selected/hovered stop sequence → which incoming travel leg is active (0 = START→01). */
export function activeLegIndex(
  stops: { id: string; seq: number }[],
  selectedId: string | null,
  hoveredId?: string | null,
): number {
  const id = hoveredId ?? selectedId;
  const match = id ? stops.find((s) => s.id === id) : undefined;
  const seq = match?.seq ?? 1;
  return Math.max(0, seq - 1);
}

export function roleForLeg(index: number, active: number): RouteLegRole {
  if (index < active) return "completed";
  if (index === active) return "active";
  return "future";
}
