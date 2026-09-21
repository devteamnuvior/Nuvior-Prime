import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS_POLICY, SECURITY_HEADERS } from "./securityHeaders";

describe("Permissions-Policy", () => {
  it("allows geolocation for the same origin only", () => {
    expect(PERMISSIONS_POLICY).toBe("camera=(), microphone=(), geolocation=(self)");
    expect(PERMISSIONS_POLICY).not.toContain("geolocation=()");
    expect(PERMISSIONS_POLICY).not.toContain("geolocation=*");
  });

  it("is the Permissions-Policy value shipped on every path", () => {
    const header = SECURITY_HEADERS.find((h) => h.key === "Permissions-Policy");
    expect(header?.value).toBe(PERMISSIONS_POLICY);
  });

  it("is wired through next.config.ts (not middleware)", () => {
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    const middleware = readFileSync(resolve(process.cwd(), "src/middleware.ts"), "utf8");
    expect(config).toContain("SECURITY_HEADERS");
    expect(middleware).not.toMatch(/Permissions-Policy|geolocation=\(\)/);
  });
});
