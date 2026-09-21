import { describe, expect, it } from "vitest";
import {
  CAPABILITY_TAGS,
  CAPABILITY_TAXONOMY_VERSION,
  assertCapabilityTags,
  isCapabilityTag,
} from "./capabilityTaxonomy";

describe("capability taxonomy", () => {
  it("is versioned and closed", () => {
    expect(CAPABILITY_TAXONOMY_VERSION).toBe("1.0.0");
    expect(CAPABILITY_TAGS).toContain("THREAD_LIFTING");
    expect(CAPABILITY_TAGS.length).toBeGreaterThanOrEqual(9);
  });

  it("rejects unknown tags", () => {
    expect(isCapabilityTag("THREAD_LIFTING")).toBe(true);
    expect(isCapabilityTag("RANDOM_CAPABILITY")).toBe(false);
    expect(() => assertCapabilityTags(["THREAD_LIFTING", "NOT_A_TAG"])).toThrow(/Unknown capability tag/);
  });
});
