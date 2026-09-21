import { describe, expect, it } from "vitest";
import {
  EMPTY_MANUAL_PLAN,
  displayIds,
  isManuallyAdjusted,
  moveStop,
  removeStop,
  resetManualPlan,
  restoreStop,
  toDisplayStops,
} from "./manualPlan";

const OPT = ["a", "b", "c", "d"];

describe("Phase 8.7 — manual plan overlay", () => {
  it("defaults to the optimizer's order, unadjusted", () => {
    expect(displayIds(EMPTY_MANUAL_PLAN, OPT)).toEqual(OPT);
    expect(isManuallyAdjusted(EMPTY_MANUAL_PLAN, OPT)).toBe(false);
  });

  it("moves a stop up and down and flags the plan adjusted", () => {
    const up = moveStop(EMPTY_MANUAL_PLAN, OPT, "c", -1);
    expect(displayIds(up, OPT)).toEqual(["a", "c", "b", "d"]);
    expect(isManuallyAdjusted(up, OPT)).toBe(true);

    const backDown = moveStop(up, OPT, "c", 1);
    expect(displayIds(backDown, OPT)).toEqual(OPT);
    expect(isManuallyAdjusted(backDown, OPT)).toBe(false); // back to optimized = not adjusted
  });

  it("ignores moves past the ends and unknown ids", () => {
    expect(moveStop(EMPTY_MANUAL_PLAN, OPT, "a", -1)).toBe(EMPTY_MANUAL_PLAN);
    expect(moveStop(EMPTY_MANUAL_PLAN, OPT, "d", 1)).toBe(EMPTY_MANUAL_PLAN);
    expect(moveStop(EMPTY_MANUAL_PLAN, OPT, "zz", 1)).toBe(EMPTY_MANUAL_PLAN);
  });

  it("removes a stop without renumber gaps and flags adjusted", () => {
    const s = removeStop(EMPTY_MANUAL_PLAN, OPT, "b");
    expect(displayIds(s, OPT)).toEqual(["a", "c", "d"]);
    expect(isManuallyAdjusted(s, OPT)).toBe(true);
    // idempotent
    expect(removeStop(s, OPT, "b")).toBe(s);
  });

  it("restores a removed stop back to the optimizer's plan", () => {
    const removed = removeStop(EMPTY_MANUAL_PLAN, OPT, "b");
    const restored = restoreStop(removed, "b");
    expect(displayIds(restored, OPT)).toEqual(OPT);
    expect(isManuallyAdjusted(restored, OPT)).toBe(false);
  });

  it("keeps other removals when restoring one stop", () => {
    let s = removeStop(EMPTY_MANUAL_PLAN, OPT, "b");
    s = removeStop(s, OPT, "d");
    const restored = restoreStop(s, "b");
    expect(displayIds(restored, OPT)).toEqual(["a", "b", "c"]);
    expect(isManuallyAdjusted(restored, OPT)).toBe(true); // d still removed
  });

  it("move + remove compose", () => {
    let s = moveStop(EMPTY_MANUAL_PLAN, OPT, "d", -1); // a b d c
    s = removeStop(s, OPT, "b"); // a d c
    expect(displayIds(s, OPT)).toEqual(["a", "d", "c"]);
    expect(isManuallyAdjusted(s, OPT)).toBe(true);
  });

  it("survives a changed optimized set (stale ids dropped)", () => {
    const s = moveStop(EMPTY_MANUAL_PLAN, OPT, "c", -1);
    // New run without "c"
    expect(displayIds(s, ["a", "b", "d"])).toEqual(["a", "b", "d"]);
  });

  it("reset returns to the pristine plan", () => {
    const dirty = removeStop(moveStop(EMPTY_MANUAL_PLAN, OPT, "c", -1), OPT, "a");
    expect(isManuallyAdjusted(dirty, OPT)).toBe(true);
    const reset = resetManualPlan();
    expect(displayIds(reset, OPT)).toEqual(OPT);
    expect(isManuallyAdjusted(reset, OPT)).toBe(false);
  });

  it("renumbers display sequence after remove and reorder", () => {
    const planned = OPT.map((id, i) => ({
      accountId: id,
      sequence: i + 1,
      businessName: id,
    }));
    const removed = removeStop(EMPTY_MANUAL_PLAN, OPT, "b");
    const display = toDisplayStops(removed, planned as never);
    expect(display.map((d) => d.displaySeq)).toEqual([1, 2, 3]);
    expect(display.map((d) => d.accountId)).toEqual(["a", "c", "d"]);
  });
});
