import { describe, expect, it } from "vitest";
import { clock12, clockOptions } from "./format";

describe("Phase 8.8 — 12-hour day controls", () => {
  it("never presents 17:00 as ambiguous 05:00", () => {
    expect(clock12("09:00")).toBe("9:00 AM");
    expect(clock12("17:00")).toBe("5:00 PM");
    expect(clock12("12:00")).toBe("12:00 PM");
    expect(clock12("00:00")).toBe("12:00 AM");
  });

  it("clock option labels are 12-hour", () => {
    const opts = clockOptions();
    expect(opts.find((o) => o.value === "09:00")?.label).toBe("9:00 AM");
    expect(opts.find((o) => o.value === "17:00")?.label).toBe("5:00 PM");
    expect(opts.every((o) => /AM|PM/.test(o.label))).toBe(true);
  });
});
