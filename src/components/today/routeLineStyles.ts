import type { RouteLegRole } from "@/domain/routing/routeLegs";

/**
 * Ride-hailing-quiet strokes. Direction is a restrained dark→open wash
 * on the active leg — one continuous line, no dashes or traveling marks.
 */
export const ROUTE_LINE = {
  casing: { color: "#F3EFE6", weight: 6, opacity: 0.42 },
  activeBase: { color: "#163F38", weight: 4, opacity: 0.96 },
  future: { color: "#1A4A44", weight: 2, opacity: 0.22 },
  completed: { color: "#8A908C", weight: 2, opacity: 0.16 },
} as const;

export const ACTIVE_GRADIENT = { from: "#163F38", to: "#247A6C", bands: 3 } as const;

export function strokeForRole(role: RouteLegRole) {
  if (role === "active") return ROUTE_LINE.activeBase;
  if (role === "completed") return ROUTE_LINE.completed;
  return ROUTE_LINE.future;
}

export function activeBandColor(t: number): string {
  return lerpHex(ACTIVE_GRADIENT.from, ACTIVE_GRADIENT.to, Math.min(1, Math.max(0, t)));
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function hex(c: string): [number, number, number] {
  const n = c.replace("#", "");
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
