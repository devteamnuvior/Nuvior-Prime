/**
 * Phase 7 — import/normalize/precedence/fail-closed CRM adapter tests.
 * No live credentials required.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  normalizeAccountRow,
  normalizeAcademyRow,
  normalizeDncRow,
  normalizeOrderRow,
  parseBool,
  deriveFormerMesoestetic,
  normalizePathway,
} from "@/providers/crm/import/normalize";
import { mergePartials } from "@/providers/crm/import/merge";
import { parseSourceFile } from "@/providers/crm/import/parse";
import { dryMergeFromPartials } from "@/providers/crm/import/runImport";
import { evaluateDnc } from "@/domain/crm/dnc";
import { matchPublicToCrm } from "@/domain/crm/matching";
import { getCrmProvider } from "@/providers";
import { filterCrmFieldsForVisibility } from "@/domain/auth/permissions";
import { AuthError, requireCrmExternalAccess } from "@/lib/authz";
import type { AuthUser } from "@/domain/auth/permissions";
import { readFileSync } from "fs";
import { join } from "path";
import type { CrmSourceKind } from "@/providers/crm/import/types";

const onRep: AuthUser = {
  id: "u1",
  email: "on.rep@nuvior.local",
  displayName: "ON Rep",
  role: "REP",
  status: "ACTIVE",
  provinces: ["ON"],
  territories: [],
};

describe("Phase 7 CRM import normalization", () => {
  it("normalizes phones, postal, province, pathway", () => {
    const a = normalizeAccountRow({
      crmExternalId: "X1",
      businessName: " Clinic ",
      phone: "(416) 555-0101",
      postalCode: "m5s 1n4",
      provinceCode: "Ontario",
    });
    expect(a.phone).toBe("4165550101");
    expect(a.postalCode).toBe("M5S1N4");
    expect(a.provinceCode).toBe("ON");
    expect(normalizePathway("4-level")).toBe("FOUR_LEVEL");
    expect(parseBool("Y")).toBe(true);
  });

  it("rejects malformed account rows", () => {
    const a = normalizeAccountRow({ crmExternalId: "", businessName: "" });
    expect(a.parseErrors.length).toBeGreaterThan(0);
  });

  it("does not invent missing fields", () => {
    const a = normalizeAccountRow({
      crmExternalId: "X",
      businessName: "A",
    });
    expect(a.lastOrderDate).toBeUndefined();
    expect(a.hasAcademyAccount).toBeUndefined();
  });

  it("maps DNC and marks verified", () => {
    const d = normalizeDncRow({ crmExternalId: "X", doNotContact: "yes" });
    expect(d.doNotContact).toBe(true);
    expect(d.dncVerified).toBe(true);
  });

  it("maps certification from academy", () => {
    const a = normalizeAcademyRow({
      crmExternalId: "X",
      hasAcademyAccount: true,
      aptosCertificationLevel: "Level 3",
      aptosPathway: "THREE_LEVEL",
    });
    expect(a.aptosPathway).toBe("THREE_LEVEL");
    expect(a.aptosCertificationLevel).toBe("Level 3");
  });

  it("derives former Mesoestetic deterministically from product families", () => {
    expect(deriveFormerMesoestetic(null, ["Dermaceutic"])).toBe(false);
    expect(deriveFormerMesoestetic(null, ["Mesoestetic peels"])).toBe(true);
    expect(deriveFormerMesoestetic(true, [])).toBe(true);
    const o = normalizeOrderRow({
      crmExternalId: "X",
      productFamilies: ["Mesoestetic"],
    });
    expect(o.formerMesoesteticCustomer).toBe(true);
  });

  it("maps last order date", () => {
    const o = normalizeOrderRow({
      crmExternalId: "X",
      lastOrderDate: "2026-06-01",
    });
    expect(o.lastOrderDate).toBe("2026-06-01");
  });
});

describe("Phase 7 multi-source precedence", () => {
  it("lets DNC source override accounts; academy owns cert", () => {
    const { accounts } = mergePartials([
      normalizeAccountRow({
        crmExternalId: "M1",
        businessName: "Merge Clinic",
        provinceCode: "ON",
      }),
      normalizeAcademyRow({
        crmExternalId: "M1",
        aptosPathway: "FOUR_LEVEL",
        aptosCertificationLevel: "L1",
      }),
      normalizeDncRow({ crmExternalId: "M1", doNotContact: true }),
      normalizeOrderRow({
        crmExternalId: "M1",
        lastOrderDate: "2025-01-01",
        // orders must not invent DNC
      }),
    ]);
    const a = accounts[0]!;
    expect(a.doNotContact).toBe(true);
    expect(a.dncVerified).toBe(true);
    expect(a.aptosPathway).toBe("FOUR_LEVEL");
    expect(a.lastOrderDate).toBe("2025-01-01");
    expect(a.provenance.doNotContact?.source).toBe("dnc");
    expect(a.provenance.aptosPathway?.source).toBe("academy");
  });

  it("leaves DNC unverified when master missing", () => {
    const { accounts } = mergePartials([
      normalizeAccountRow({
        crmExternalId: "M2",
        businessName: "No DNC",
      }),
    ]);
    expect(accounts[0]!.dncVerified).toBe(false);
    expect(accounts[0]!.doNotContact).toBeNull();
  });
});

describe("Phase 7 fixtures dry-merge", () => {
  it("imports fixture bundle without DB writes", () => {
    const dir = join(process.cwd(), "fixtures/crm");
    const sources: CrmSourceKind[] = ["accounts", "academy", "orders", "dnc", "visits"];
    const partials = sources.flatMap((source) => {
      const parsed = parseSourceFile(
        source,
        readFileSync(join(dir, `${source}.json`), "utf8"),
        "json",
      );
      return parsed.partials;
    });
    const { accounts } = dryMergeFromPartials(partials);
    expect(accounts.length).toBeGreaterThanOrEqual(3);
    const dnc = accounts.find((a) => a.doNotContact)!;
    expect(dnc.dncVerified).toBe(true);
    const unverified = accounts.find((a) => a.crmExternalId === "CRM-IMP-002")!;
    expect(unverified.dncVerified).toBe(false);
    expect(unverified.formerMesoesteticCustomer).toBe(true);
  });
});

describe("Phase 7 DNC fail-safe", () => {
  it("marks unverified when dncVerified=false", () => {
    const acct = {
      crmExternalId: "U",
      businessName: "U",
      streetAddress: null,
      city: null,
      provinceCode: "ON",
      postalCode: null,
      phone: null,
      email: null,
      placeId: null,
      websiteDomain: null,
      assignedRep: null,
      internalStatus: null,
      hasAcademyAccount: null,
      aptosCertificationLevel: null,
      aptosPathway: "NONE" as const,
      staffEligibleFor4Level: null,
      formerMesoesteticCustomer: false,
      mesoesteticRetentionFlag: false,
      lastOrderDate: null,
      doNotContact: false,
      dncVerified: false,
      lastVisitDate: null,
      nextRevisitDueDate: null,
      visitNotes: null,
      historicalProductInterest: null,
      credentials: {
        hasPhysicianOrNp: false,
        hasRn: false,
        hasNd: false,
        hasImg: false,
        hasAllied: false,
        physicianOrNpOnSiteForPrp: false,
        rnHasPhysicianDirective: false,
      },
    };
    const decision = evaluateDnc(
      {
        state: "EXACT",
        method: "place_id",
        confidence: 1,
        candidates: [],
        crmAccount: acct,
        reason: "t",
      },
      acct,
    );
    expect(decision.crmUnverified).toBe(true);
    expect(decision.excluded).toBe(false);
  });
});

describe("Phase 7 provider fail-closed", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  beforeEach(() => {
    process.env = { ...prev };
  });

  it("api mode does not fall back to mock", async () => {
    process.env.CRM_PROVIDER = "api";
    delete process.env.CRM_ALLOW_MOCK_FALLBACK;
    const p = getCrmProvider();
    expect(p.name).toBe("api");
    expect(p.isUnavailable()).toBe(true);
    expect(await p.listAccounts()).toEqual([]);
  });

  it("unknown provider does not silently use mock", () => {
    process.env.CRM_PROVIDER = "invented-vendor";
    delete process.env.CRM_ALLOW_MOCK_FALLBACK;
    const p = getCrmProvider();
    expect(p.name).toBe("unavailable");
    expect(p.isUnavailable()).toBe(true);
  });

  it("import mode selects import provider", () => {
    process.env.CRM_PROVIDER = "import";
    expect(getCrmProvider().name).toBe("import");
  });

  it("mock still works", () => {
    process.env.CRM_PROVIDER = "mock";
    expect(getCrmProvider().name).toBe("mock");
  });
});

describe("Phase 7 matching with real ids", () => {
  it("exact place id match from imported-shaped accounts", () => {
    const accounts = dryMergeFromPartials([
      normalizeAccountRow({
        crmExternalId: "CRM-IMP-001",
        businessName: "Import Fixture Yorkville Derm",
        placeId: "mock-on-001",
        postalCode: "M5S1N4",
        provinceCode: "ON",
      }),
      normalizeDncRow({ crmExternalId: "CRM-IMP-001", doNotContact: false }),
    ]).accounts;

    const r = matchPublicToCrm(
      {
        placeId: "mock-on-001",
        businessName: "Import Fixture Yorkville Derm",
        streetAddress: "120 Bloor",
        postalCode: "M5S 1N4",
      },
      accounts,
      [],
    );
    expect(r.state).toBe("EXACT");
    expect(r.crmAccount?.crmExternalId).toBe("CRM-IMP-001");
  });

  it("preserves verified mapping over fuzzy", () => {
    const accounts = dryMergeFromPartials([
      normalizeAccountRow({
        crmExternalId: "CRM-A",
        businessName: "Alpha",
        placeId: "p1",
        provinceCode: "ON",
      }),
      normalizeAccountRow({
        crmExternalId: "CRM-B",
        businessName: "Alpha Clinic Nearby",
        placeId: "p2",
        provinceCode: "ON",
      }),
      normalizeDncRow({ crmExternalId: "CRM-A", doNotContact: false }),
      normalizeDncRow({ crmExternalId: "CRM-B", doNotContact: false }),
    ]).accounts;

    const r = matchPublicToCrm(
      {
        placeId: "p1",
        businessName: "Alpha Clinic Nearby",
        streetAddress: "x",
        postalCode: "M5S1N4",
      },
      accounts,
      [
        {
          crmExternalId: "CRM-A",
          placeId: "p1",
          normalizedBusinessName: "alpha",
          normalizedAddress: null,
          matchMethod: "verified_mapping",
          matchConfidence: 1,
          verified: true,
          rejected: false,
        },
      ],
    );
    expect(r.method).toBe("verified_mapping");
    expect(r.crmAccount?.crmExternalId).toBe("CRM-A");
  });
});

describe("Phase 7 authorization / visibility", () => {
  it("blocks CRM id fetch outside territory (DOR)", () => {
    try {
      requireCrmExternalAccess(onRep, "CRM-AB-1", "AB");
      expect.fail("expected territory deny");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      expect((e as AuthError).code).toBe("TERRITORY");
    }
    expect(() => requireCrmExternalAccess(onRep, "CRM-ON-1", "ON")).not.toThrow();
  });

  it("denies when province unknown", () => {
    try {
      requireCrmExternalAccess(onRep, "CRM-X", null);
      expect.fail("expected deny");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError);
      expect((e as AuthError).code).toBe("TERRITORY");
    }
  });

  it("hides diagnostics from reps", () => {
    const filtered = filterCrmFieldsForVisibility(
      { doNotContact: true, rawPayload: { secret: 1 }, dncDebug: "x" },
      "rep",
    );
    expect(filtered.rawPayload).toBeUndefined();
    expect(filtered.dncDebug).toBeUndefined();
    expect(filtered.doNotContact).toBe(true);
  });
});

describe("Phase 7 CSV parse", () => {
  it("parses simple CSV accounts", () => {
    const csv = `crmExternalId,businessName,provinceCode
CRM-CSV-1,Csv Clinic,ON
,Missing Name,ON`;
    const parsed = parseSourceFile("accounts", csv, "csv");
    expect(parsed.recordsRead).toBe(2);
    expect(parsed.partials[1]!.parseErrors.length).toBeGreaterThan(0);
  });
});
