import type { AppRoleName } from "@/domain/auth/permissions";

/** Result shape shared by admin user-management server actions and their UI. */
export type UserActionResult = {
  ok: boolean;
  message: string;
  /** Per-field validation messages keyed by input name (e.g. "email"). */
  fieldErrors?: Record<string, string>;
};

/** Serializable user row handed from the admin page to client components. */
export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  role: AppRoleName;
  status: "ACTIVE" | "DISABLED";
  provinces: string[];
  territories: string[];
  createdAt: string;
  lastLoginAt: string | null;
};
