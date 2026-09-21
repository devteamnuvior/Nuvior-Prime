import { auth } from "@/auth";
import type { AuthUser } from "@/domain/auth/permissions";
import { AuthError } from "@/lib/authz";

/**
 * Resolve current authenticated user from session.
 * Throws AuthError if missing/disabled — never falls back to anonymous privilege.
 */
export async function requireSessionUser(): Promise<AuthUser> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || u.status === "DISABLED") {
    throw new AuthError("Authentication required", "UNAUTHENTICATED");
  }
  return {
    id: u.id,
    email: u.email,
    displayName: u.name,
    role: u.role,
    status: u.status,
    provinces: u.provinces,
    territories: u.territories,
  };
}

export async function getOptionalSessionUser(): Promise<AuthUser | null> {
  try {
    return await requireSessionUser();
  } catch {
    return null;
  }
}
