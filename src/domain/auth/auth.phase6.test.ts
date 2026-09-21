import { describe, expect, it } from "vitest";
import {
  hasPermission,
  canAccessProvince,
  permissionsForRole,
  filterCrmFieldsForVisibility,
  type AuthUser,
} from "@/domain/auth/permissions";
import { AuthError, requirePermission, requireProvinceAccess } from "@/lib/authz";
import { qualifyAccount } from "@/domain/qualification";

function user(partial: Partial<AuthUser> & Pick<AuthUser, "role" | "provinces">): AuthUser {
  return {
    id: partial.id ?? "u1",
    email: partial.email ?? "t@nuvior.local",
    displayName: partial.displayName ?? "Test",
    status: partial.status ?? "ACTIVE",
    territories: partial.territories ?? [],
    role: partial.role,
    provinces: partial.provinces,
  };
}

describe("permission matrix", () => {
  it("REP cannot manage users or confirm mappings", () => {
    expect(hasPermission("REP", "user.manage")).toBe(false);
    expect(hasPermission("REP", "mapping.confirm")).toBe(false);
    expect(hasPermission("REP", "prospect.run")).toBe(true);
    expect(hasPermission("REP", "visit.create")).toBe(true);
  });

  it("MANAGER can review mappings and team visits, not users", () => {
    expect(hasPermission("MANAGER", "mapping.confirm")).toBe(true);
    expect(hasPermission("MANAGER", "visit.view.team")).toBe(true);
    expect(hasPermission("MANAGER", "user.manage")).toBe(false);
  });

  it("ADMIN has user.manage and audit.view", () => {
    expect(hasPermission("ADMIN", "user.manage")).toBe(true);
    expect(hasPermission("ADMIN", "audit.view")).toBe(true);
    expect(permissionsForRole("ADMIN")).toContain("admin.settings");
  });
});

describe("territory access", () => {
  it("Ontario REP cannot access Alberta", () => {
    const onRep = user({ role: "REP", provinces: ["ON"] });
    expect(canAccessProvince(onRep, "ON")).toBe(true);
    expect(canAccessProvince(onRep, "AB")).toBe(false);
    expect(() => requireProvinceAccess(onRep, "AB")).toThrow(AuthError);
  });

  it("Alberta REP cannot access Ontario", () => {
    const abRep = user({ role: "REP", provinces: ["AB"] });
    expect(canAccessProvince(abRep, "ON")).toBe(false);
  });

  it("ADMIN with * sees all provinces", () => {
    const admin = user({ role: "ADMIN", provinces: ["*"] });
    expect(canAccessProvince(admin, "ON")).toBe(true);
    expect(canAccessProvince(admin, "AB")).toBe(true);
    expect(canAccessProvince(admin, "BC")).toBe(true);
  });

  it("disabled user is blocked", () => {
    const disabled = user({ role: "REP", provinces: ["ON"], status: "DISABLED" });
    expect(canAccessProvince(disabled, "ON")).toBe(false);
    expect(() => requirePermission(disabled, "prospect.run")).toThrow(/disabled/i);
  });
});

describe("DNC non-override", () => {
  it("no role changes qualification DNC exclusion", () => {
    const result = qualifyAccount({
      businessName: "DNC",
      provinceCode: "ON",
      segmentNumber: 1,
      categoryNumber: 1,
      categoryLabel: "Plastic & cosmetic surgery clinic",
      organizationTypeLabel: "Independent",
      credentials: {
        hasPhysicianOrNp: true,
        hasRn: false,
        hasNd: false,
        hasImg: false,
        hasAllied: false,
        physicianOrNpOnSiteForPrp: true,
        rnHasPhysicianDirective: false,
      },
      advertisesThreadLifting: true,
      pricePositioning: "premium",
      formerMesoesteticCustomer: false,
      doNotContact: true,
      hasAcademyAccount: false,
      aptosPathway: "NONE",
      injectablesOffered: "yes",
      threadsOffered: "PDO",
      skincareLines: "unknown",
    });
    expect(result.excluded).toBe(true);
    expect(result.exclusionReason).toBe("Do-Not-Contact");
    // ADMIN privilege is irrelevant to qualification
    expect(hasPermission("ADMIN", "prospect.run")).toBe(true);
  });
});

describe("CRM field visibility", () => {
  it("hides diagnostics from reps", () => {
    const fields = {
      doNotContact: true,
      rawPayload: { secret: 1 },
      dncDebug: "debug",
      lastOrderDate: "2026-01-01",
    };
    const rep = filterCrmFieldsForVisibility(fields, "rep");
    expect(rep.doNotContact).toBe(true);
    expect(rep.rawPayload).toBeUndefined();
    expect(rep.dncDebug).toBeUndefined();
    const admin = filterCrmFieldsForVisibility(fields, "admin");
    expect(admin.rawPayload).toEqual({ secret: 1 });
  });
});

describe("authorization helpers", () => {
  it("requirePermission throws FORBIDDEN", () => {
    const rep = user({ role: "REP", provinces: ["ON"] });
    try {
      requirePermission(rep, "user.manage");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      expect((e as AuthError).code).toBe("FORBIDDEN");
    }
  });
});
