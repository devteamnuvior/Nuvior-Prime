/**
 * Centralized permissions — roles resolve to permission sets.
 * Never scatter `if (role === "ADMIN")` in feature code.
 */

export type Permission =
  | "prospect.run"
  | "prospect.view"
  | "brief.generate"
  | "brief.view"
  | "visit.create"
  | "visit.view.own"
  | "visit.view.team"
  | "mapping.review"
  | "mapping.confirm"
  | "verification.review"
  | "account.assign"
  | "user.manage"
  | "audit.view"
  | "admin.settings";

export type AppRoleName = "REP" | "MANAGER" | "ADMIN";

const ROLE_PERMISSIONS: Record<AppRoleName, readonly Permission[]> = {
  REP: [
    "prospect.run",
    "prospect.view",
    "brief.generate",
    "brief.view",
    "visit.create",
    "visit.view.own",
    "verification.review",
  ],
  MANAGER: [
    "prospect.run",
    "prospect.view",
    "brief.generate",
    "brief.view",
    "visit.create",
    "visit.view.own",
    "visit.view.team",
    "mapping.review",
    "mapping.confirm",
    "verification.review",
    "account.assign",
  ],
  ADMIN: [
    "prospect.run",
    "prospect.view",
    "brief.generate",
    "brief.view",
    "visit.create",
    "visit.view.own",
    "visit.view.team",
    "mapping.review",
    "mapping.confirm",
    "verification.review",
    "account.assign",
    "user.manage",
    "audit.view",
    "admin.settings",
  ],
};

export function permissionsForRole(role: AppRoleName): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: AppRoleName, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppRoleName;
  status: "ACTIVE" | "DISABLED";
  provinces: string[];
  territories: string[];
};

/**
 * Territory access: ADMIN with ["*"] sees all.
 * Otherwise province must be in user's provinces list.
 */
export function canAccessProvince(user: AuthUser, provinceCode: string): boolean {
  if (user.status !== "ACTIVE") return false;
  if (user.provinces.includes("*")) return true;
  return user.provinces.includes(provinceCode);
}

export function accessibleProvinces(user: AuthUser, allCodes: string[]): string[] {
  if (user.provinces.includes("*")) return [...allCodes];
  return user.provinces.filter((p) => allCodes.includes(p));
}

/**
 * Field visibility for CRM overlay — rep sees operational fields, not raw diagnostics.
 */
export type CrmVisibilityLevel = "rep" | "manager" | "admin";

export function crmVisibilityForRole(role: AppRoleName): CrmVisibilityLevel {
  if (role === "ADMIN") return "admin";
  if (role === "MANAGER") return "manager";
  return "rep";
}

export function filterCrmFieldsForVisibility(
  fields: Record<string, unknown>,
  level: CrmVisibilityLevel,
): Record<string, unknown> {
  const allowedRep = new Set([
    "doNotContact",
    "hasAcademyAccount",
    "aptosCertificationLevel",
    "aptosPathway",
    "formerMesoesteticCustomer",
    "lastOrderDate",
    "lastOrderStatus",
    "lastVisitDate",
    "nextRevisitDueDate",
    "matchState",
    "crmExternalId",
  ]);
  const denyRep = new Set([
    "rawPayload",
    "providerErrors",
    "dncDebug",
    "internalDiagnostics",
  ]);

  if (level === "admin") return { ...fields };
  if (level === "manager") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (!denyRep.has(k) || k === "dncDebug") out[k] = v;
    }
    return out;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (allowedRep.has(k)) out[k] = v;
  }
  return out;
}
