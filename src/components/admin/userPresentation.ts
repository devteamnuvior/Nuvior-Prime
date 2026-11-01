import type { AppRoleName } from "@/domain/auth/permissions";
import { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";

export const ROLE_META: Record<
  AppRoleName,
  { label: string; short: string; description: string; tone: "neutral" | "primary" | "inverse" }
> = {
  REP: {
    label: "Representative",
    short: "Rep",
    description: "Runs prospecting, builds briefs and records their own visits.",
    tone: "neutral",
  },
  MANAGER: {
    label: "Manager",
    short: "Manager",
    description: "Everything a rep can do, plus team visibility, CRM matching and assignments.",
    tone: "primary",
  },
  ADMIN: {
    label: "Administrator",
    short: "Admin",
    description: "Full access including user management, audit log and system settings.",
    tone: "inverse",
  },
};

export const ROLE_ORDER: AppRoleName[] = ["ADMIN", "MANAGER", "REP"];

export const PROVINCE_OPTIONS = CANADIAN_PROVINCES.map((p) => ({ code: p.code, name: p.name }));

export function provinceName(code: string): string {
  return PROVINCE_OPTIONS.find((p) => p.code === code)?.name ?? code;
}

export function initialsOf(name: string, fallback: string): string {
  // Drop parenthesised suffixes like "(Dev)" and anything that is not a letter or digit.
  const cleaned = name.replace(/\([^)]*\)/g, " ");
  const parts = cleaned
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const fb = fallback.replace(/[^\p{L}\p{N}]/gu, "");
  return (fb.slice(0, 2) || "?").toUpperCase();
}

/** Deterministic hue (0–360) for a seed; the avatar derives its colours from the theme + this hue. */
export function avatarHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  // Eight muted hues spread around the wheel, biased away from pure red.
  return [168, 36, 232, 310, 96, 14, 204, 48][h % 8];
}

export function formatRelative(iso: string | null, now = Date.now()): string {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(then);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const label = ["Too short", "Weak", "Fair", "Good", "Strong"][score];
  return { score: score as 0 | 1 | 2 | 3 | 4, label };
}

export function generatePassword(length = 14): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
