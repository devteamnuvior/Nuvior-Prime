/**
 * Shared motion tokens — calm field-sales motion, not decorative animation.
 *
 *   fast          — hover / selection chrome
 *   routeReveal   — START → 01 draw
 *   markerConfirm — one-shot arrival on Stop 01
 *   mapTransition — pan / fit
 *   startPulse    — START halo (marker only — not a route object)
 */

export const MOTION = {
  fastMs: 180,
  routeRevealMs: 850,
  markerConfirmMs: 420,
  mapTransitionMs: 380,
  travelPulseMs: 2400,
  startPulseMs: 3400,
} as const;

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
