import type { VisitListEntry } from "@/domain/visitList";
import { pointInWorkingArea } from "@/domain/geo/workingArea";
import type { AreaStrategy } from "./travelReach";

export type OpportunitySummary = {
  qualified: number;
  byFit: Record<1 | 2 | 3 | 4 | 5, number>;
  revisitsDue: number;
};

export function opportunitySummary(pool: VisitListEntry[]): OpportunitySummary {
  const byFit: OpportunitySummary["byFit"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let revisitsDue = 0;
  for (const e of pool) {
    const f = e.fitScore;
    if (f >= 1 && f <= 5) byFit[f as 1 | 2 | 3 | 4 | 5] += 1;
    if (e.isRevisit) revisitsDue += 1;
  }
  return { qualified: pool.length, byFit, revisitsDue };
}

/**
 * Re-filter an already-qualified pool when Today's Area changes.
 * Does not call discovery. Drawn areas use point-in-polygon on stored coords.
 * Drive-time / radius modes keep the last-run pool (those constraints were
 * applied at build time).
 */
export function filterPoolByArea(
  pool: VisitListEntry[],
  coords: Record<string, { lat: number; lng: number }>,
  area: AreaStrategy,
): VisitListEntry[] {
  if (area.kind !== "drawn") return pool;
  return pool.filter((e) => {
    const c = coords[e.accountId];
    if (!c) return false;
    return pointInWorkingArea(c, area.points);
  });
}

export type CandidateKind = "prospect" | "nuvior" | "revisit" | "verify";

export type CandidateDot = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  fit: number;
  revisit: boolean;
  kind: CandidateKind;
};

export type CandidateMarker =
  | { type: "dot"; dot: CandidateDot }
  | { type: "cluster"; id: string; lat: number; lng: number; count: number };

/**
 * Qualified, non-routed accounts for the subordinate candidate layer.
 * `qualifiedPool` has already had DNC removed — never pass raw discovered coords.
 */
export function candidateDots(
  pool: VisitListEntry[],
  coords: Record<string, { lat: number; lng: number }>,
  routedIds: Set<string>,
  opts?: {
    cap?: number;
    crmApplied?: Record<string, { applied?: boolean; crmExternalId?: string | null }>;
  },
): CandidateDot[] {
  const cap = opts?.cap ?? 40;
  const crm = opts?.crmApplied ?? {};
  const out: CandidateDot[] = [];
  for (const e of pool) {
    if (routedIds.has(e.accountId)) continue;
    const c = coords[e.accountId];
    if (!c) continue;
    const overlay = crm[e.accountId];
    const kind: CandidateKind = e.isRevisit
      ? "revisit"
      : e.needsManualVerification
        ? "verify"
        : overlay?.applied || overlay?.crmExternalId
          ? "nuvior"
          : "prospect";
    out.push({
      id: e.accountId,
      lat: c.lat,
      lng: c.lng,
      name: e.businessName,
      fit: e.fitScore,
      revisit: e.isRevisit,
      kind,
    });
    if (out.length >= cap) break;
  }
  return out;
}

/** Grid-cluster when density is high so the map is not a pile of overlapping dots. */
export function clusterCandidateDots(dots: CandidateDot[], cellDeg = 0.02): CandidateMarker[] {
  if (dots.length < 16) return dots.map((dot) => ({ type: "dot", dot }));
  const buckets = new Map<string, CandidateDot[]>();
  for (const d of dots) {
    const key = `${Math.round(d.lat / cellDeg)}:${Math.round(d.lng / cellDeg)}`;
    const list = buckets.get(key) ?? [];
    list.push(d);
    buckets.set(key, list);
  }
  const out: CandidateMarker[] = [];
  for (const [key, list] of buckets) {
    if (list.length === 1) {
      out.push({ type: "dot", dot: list[0]! });
      continue;
    }
    const lat = list.reduce((s, d) => s + d.lat, 0) / list.length;
    const lng = list.reduce((s, d) => s + d.lng, 0) / list.length;
    out.push({ type: "cluster", id: `cluster:${key}`, lat, lng, count: list.length });
  }
  return out;
}
