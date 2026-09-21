/**
 * Phase 8.7 — manual reorder/remove of routed stops (client-side, session-only).
 *
 * Honesty contract: the optimizer's plan is never mutated. Manual adjustments
 * are a display-order overlay; once the plan is adjusted, arrival/departure
 * estimates, leg times and road geometry from the optimized plan are no longer
 * valid for the displayed order, so the UI must hide them and offer a rebuild.
 * Pure functions — unit-testable without React.
 */

export type ManualPlanState = {
  /** Display order (account ids). null = optimizer order. */
  order: string[] | null;
  /** Stops the rep removed from today's plan. */
  removed: string[];
};

export const EMPTY_MANUAL_PLAN: ManualPlanState = { order: null, removed: [] };

/** Display order: manual order if set, else optimized; removed stops dropped. */
export function displayIds(state: ManualPlanState, optimizedIds: string[]): string[] {
  const base = state.order ?? optimizedIds;
  const removed = new Set(state.removed);
  const known = new Set(optimizedIds);
  return base.filter((id) => known.has(id) && !removed.has(id));
}

/** True when the displayed plan deviates from the optimizer's plan. */
export function isManuallyAdjusted(state: ManualPlanState, optimizedIds: string[]): boolean {
  if (state.removed.length > 0) return true;
  if (state.order == null) return false;
  const display = displayIds(state, optimizedIds);
  const optimized = displayIds({ order: null, removed: state.removed }, optimizedIds);
  return display.join("|") !== optimized.join("|");
}

/** Move a stop one position earlier (-1) or later (+1) in the display order. */
export function moveStop(
  state: ManualPlanState,
  optimizedIds: string[],
  id: string,
  direction: -1 | 1,
): ManualPlanState {
  const current = displayIds(state, optimizedIds);
  const from = current.indexOf(id);
  if (from === -1) return state;
  const to = from + direction;
  if (to < 0 || to >= current.length) return state;
  const next = [...current];
  next[from] = next[to]!;
  next[to] = id;
  return { order: next, removed: state.removed };
}

/** Remove a stop from today's displayed plan (does not touch the snapshot). */
export function removeStop(
  state: ManualPlanState,
  optimizedIds: string[],
  id: string,
): ManualPlanState {
  if (!optimizedIds.includes(id) || state.removed.includes(id)) return state;
  return {
    order: state.order ? state.order.filter((x) => x !== id) : null,
    removed: [...state.removed, id],
  };
}

/** Restore a previously removed stop at its optimized position. */
export function restoreStop(state: ManualPlanState, id: string): ManualPlanState {
  if (!state.removed.includes(id)) return state;
  return {
    // Dropping any manual order keeps restore semantics simple and honest:
    // the restored plan is exactly the optimizer's plan minus other removals.
    order: null,
    removed: state.removed.filter((x) => x !== id),
  };
}

export function resetManualPlan(): ManualPlanState {
  return EMPTY_MANUAL_PLAN;
}

import type { PlannedRouteStop } from "@/domain/routing/optimize";

/** A routed stop with its (possibly manually adjusted) display sequence. */
export type DisplayStop = PlannedRouteStop & { displaySeq: number };

export function toDisplayStops(
  state: ManualPlanState,
  optimizedStops: PlannedRouteStop[],
): DisplayStop[] {
  const byId = new Map(optimizedStops.map((s) => [s.accountId, s]));
  return displayIds(
    state,
    optimizedStops.map((s) => s.accountId),
  ).map((id, i) => ({ ...byId.get(id)!, displaySeq: i + 1 }));
}
