/**
 * Auth / RBAC / territory validation — no external IdP required.
 *
 *   npm run db:setup && npm run validate:auth
 */

import { prisma } from "../src/lib/prisma";
import {
  hasPermission,
  canAccessProvince,
  type AuthUser,
} from "../src/domain/auth/permissions";
import { qualifyAccount } from "../src/domain/qualification";
import { buildDailyVisitList } from "../src/domain/visitList";

function asUser(row: {
  id: string;
  email: string;
  displayName: string;
  role: "REP" | "MANAGER" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
  provinces: string[];
  territories: string[];
}): AuthUser {
  return { ...row };
}

async function main() {
  console.log("=== NUVIOR Prime — Auth validation (Phase 6) ===\n");

  const users = await prisma.user.findMany({ orderBy: { email: "asc" } });
  if (users.length < 4) {
    console.error("FAILED: seed users missing — run npm run db:setup");
    process.exit(1);
  }

  const onRep = asUser(users.find((u) => u.email === "on.rep@nuvior.local")!);
  const abRep = asUser(users.find((u) => u.email === "ab.rep@nuvior.local")!);
  const onMgr = asUser(users.find((u) => u.email === "on.manager@nuvior.local")!);
  const admin = asUser(users.find((u) => u.email === "admin@nuvior.local")!);

  const checks: { name: string; ok: boolean; detail?: string }[] = [];

  checks.push({
    name: "Ontario Rep can access ON, not AB",
    ok: canAccessProvince(onRep, "ON") && !canAccessProvince(onRep, "AB"),
  });
  checks.push({
    name: "Alberta Rep can access AB, not ON",
    ok: canAccessProvince(abRep, "AB") && !canAccessProvince(abRep, "ON"),
  });
  checks.push({
    name: "Ontario Rep cannot manage users",
    ok: !hasPermission(onRep.role, "user.manage"),
  });
  checks.push({
    name: "Ontario Rep cannot confirm CRM mappings",
    ok: !hasPermission(onRep.role, "mapping.confirm"),
  });
  checks.push({
    name: "Ontario Manager can confirm mappings / view team",
    ok:
      hasPermission(onMgr.role, "mapping.confirm") &&
      hasPermission(onMgr.role, "visit.view.team"),
  });
  checks.push({
    name: "National Admin can manage users and view audit",
    ok: hasPermission(admin.role, "user.manage") && hasPermission(admin.role, "audit.view"),
  });

  // DNC cannot be forced into visit list — even for admin persona
  const dncList = buildDailyVisitList(
    {
      provinceCode: "ON",
      startPoint: { lat: 43.64, lng: -79.39 },
      dailyVisitTarget: 10,
      maxRadiusKm: 40,
      minFitScore: 1,
      alreadyVisitedNames: [],
      revisitNames: [],
    },
    [
      {
        id: "dnc-x",
        businessName: "Mock Do-Not-Contact Demo Clinic",
        parentGroupName: null,
        organizationTypeLabel: "Independent",
        segmentNumber: 1,
        categoryNumber: 1,
        categoryLabel: "Plastic & cosmetic surgery clinic",
        streetAddress: "1",
        city: "Toronto",
        provinceCode: "ON",
        postalCode: "M5V 0A1",
        latitude: 43.645,
        longitude: -79.39,
        googleMapsUrl: null,
        placeId: "mock-on-011",
        dataCompleteness: "needs_verification",
        qualificationInput: {
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
          hasAcademyAccount: null,
          aptosPathway: "NONE",
          injectablesOffered: "yes",
          threadsOffered: "PDO",
          skincareLines: "unknown",
        },
      },
    ],
  );
  checks.push({
    name: "Admin persona cannot force DNC into visit list",
    ok:
      dncList.entries.length === 0 &&
      dncList.excludedDoNotContact.includes("Mock Do-Not-Contact Demo Clinic") &&
      hasPermission(admin.role, "prospect.run"),
  });

  const q = qualifyAccount({
    businessName: "x",
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
    advertisesThreadLifting: false,
    pricePositioning: "mid",
    formerMesoesteticCustomer: false,
    doNotContact: true,
    hasAcademyAccount: null,
    aptosPathway: "NONE",
    injectablesOffered: "yes",
    threadsOffered: "none",
    skincareLines: "unknown",
  });
  checks.push({
    name: "Qualification DNC exclusion independent of role",
    ok: q.excluded && q.exclusionReason === "Do-Not-Contact",
  });

  // Cross-territory: Alberta accounts exist; ON rep must not "access" AB province
  const abAccounts = await prisma.account.count({ where: { provinceCode: "AB" } });
  checks.push({
    name: "Alberta accounts exist for leakage tests",
    ok: abAccounts > 0,
    detail: `count=${abAccounts}`,
  });
  checks.push({
    name: "ON rep province gate blocks AB account territory",
    ok: !canAccessProvince(onRep, "AB"),
  });

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    if (!c.ok) failed += 1;
    console.log(`${mark}  ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
  }

  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  if (failed) process.exit(1);
  console.log("\nLocal login: http://localhost:3000/login");
  console.log("  on.rep@nuvior.local / DevPass123!");
  console.log("  ab.rep@nuvior.local / DevPass123!");
  console.log("  on.manager@nuvior.local / DevPass123!");
  console.log("  admin@nuvior.local / DevPass123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
