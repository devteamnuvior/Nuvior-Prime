import { prisma } from "@/lib/prisma";
import type { AuthUser, Permission } from "@/domain/auth/permissions";
import { hasPermission, canAccessProvince } from "@/domain/auth/permissions";

export class AuthError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "DISABLED" | "TERRITORY",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function assertActive(user: AuthUser): void {
  if (user.status !== "ACTIVE") {
    throw new AuthError("User is disabled", "DISABLED");
  }
}

export function requirePermission(user: AuthUser, permission: Permission): void {
  assertActive(user);
  if (!hasPermission(user.role, permission)) {
    throw new AuthError(`Missing permission: ${permission}`, "FORBIDDEN");
  }
}

export function requireProvinceAccess(user: AuthUser, provinceCode: string): void {
  assertActive(user);
  if (!canAccessProvince(user, provinceCode)) {
    throw new AuthError(`No access to province ${provinceCode}`, "TERRITORY");
  }
}

/**
 * Account access: province of account must be allowed.
 * Optional assignment check for assigned-only mode (future); Phase 6 uses province.
 */
export async function requireAccountAccess(
  user: AuthUser,
  opts: { accountId?: string | null; placeId?: string | null; provinceCode?: string | null },
): Promise<{ accountId: string | null; placeId: string | null; provinceCode: string }> {
  assertActive(user);

  let provinceCode = opts.provinceCode ?? null;
  let accountId = opts.accountId ?? null;
  let placeId = opts.placeId ?? null;

  if (!provinceCode && (accountId || placeId)) {
    const account = await prisma.account.findFirst({
      where: accountId ? { id: accountId } : { placeId: placeId! },
      select: { id: true, placeId: true, provinceCode: true },
    });
    if (!account) {
      throw new AuthError("Account not found", "FORBIDDEN");
    }
    accountId = account.id;
    placeId = account.placeId;
    provinceCode = account.provinceCode;
  }

  if (!provinceCode) {
    throw new AuthError("Cannot resolve account territory", "TERRITORY");
  }

  requireProvinceAccess(user, provinceCode);
  return { accountId, placeId, provinceCode };
}

/**
 * CRM read by external id — browser-supplied CRM id is never sufficient alone.
 * Resolve territory from CRM mirror / account, then enforce province access.
 */
export function requireCrmExternalAccess(
  user: AuthUser,
  crmExternalId: string,
  crmAccountProvince: string | null | undefined,
): void {
  assertActive(user);
  if (!crmExternalId?.trim()) {
    throw new AuthError("CRM id required", "FORBIDDEN");
  }
  if (!crmAccountProvince) {
    throw new AuthError("CRM account territory unknown — deny", "TERRITORY");
  }
  requireProvinceAccess(user, crmAccountProvince);
}

export async function loadAuthUserById(id: string): Promise<AuthUser | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    status: row.status,
    provinces: row.provinces,
    territories: row.territories,
  };
}

export async function loadAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const row = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    status: row.status,
    provinces: row.provinces,
    territories: row.territories,
  };
}
