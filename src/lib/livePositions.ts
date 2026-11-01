/**
 * Live map — persistence for the latest position per rep.
 * Rules are pure in src/domain/live/positions.ts; this file only touches Prisma.
 */

import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/domain/auth/permissions";
import { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import {
  AT_CLINIC_RADIUS_M,
  boundingBox,
  deriveStatus,
  nearestClinic,
  type LiveRepDto,
  type PositionReport,
  type RepPositionDto,
} from "@/domain/live/positions";

const ALL_CODES = CANADIAN_PROVINCES.map((p) => p.code);

/** Resolve the clinic a fix is at (closest account within AT_CLINIC_RADIUS_M in the rep's provinces). */
export async function resolveClinicForFix(fix: { lat: number; lng: number }, provinces: string[]): Promise<string | null> {
  const box = boundingBox(fix, AT_CLINIC_RADIUS_M);
  const candidates = await prisma.account.findMany({
    where: {
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLng, lte: box.maxLng },
      ...(provinces.includes("*") ? {} : { provinceCode: { in: provinces } }),
    },
    select: { id: true, latitude: true, longitude: true },
    take: 50,
  });
  const hit = nearestClinic(
    fix,
    candidates.map((c) => ({ id: c.id, lat: c.latitude, lng: c.longitude })),
  );
  return hit?.id ?? null;
}

/** Upsert the caller's own position. Called by the rep client every few seconds while sharing. */
export async function recordPosition(user: AuthUser, report: PositionReport, source = "device"): Promise<RepPositionDto> {
  const recordedAt = report.recordedAt ? new Date(report.recordedAt) : new Date();
  const safeRecordedAt = Number.isNaN(recordedAt.getTime()) || recordedAt.getTime() > Date.now() + 60_000 ? new Date() : recordedAt;
  const accountId = await resolveClinicForFix(report, user.provinces);
  const data = {
    lat: report.lat,
    lng: report.lng,
    accuracyM: report.accuracyM ?? null,
    headingDeg: report.headingDeg ?? null,
    speedMps: report.speedMps ?? null,
    accountId,
    source,
    recordedAt: safeRecordedAt,
  };
  const row = await prisma.repPosition.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
    include: { account: { select: { id: true, businessName: true, city: true } } },
  });
  return toPositionDto(row);
}

function toPositionDto(row: {
  lat: number;
  lng: number;
  accuracyM: number | null;
  headingDeg: number | null;
  speedMps: number | null;
  recordedAt: Date;
  account: { id: string; businessName: string; city: string } | null;
}): RepPositionDto {
  return {
    lat: row.lat,
    lng: row.lng,
    accuracyM: row.accuracyM,
    headingDeg: row.headingDeg,
    speedMps: row.speedMps,
    recordedAt: row.recordedAt.toISOString(),
    clinic: row.account ? { id: row.account.id, name: row.account.businessName, city: row.account.city } : null,
  };
}

/** Which province codes a viewer may browse on the live map ("*" = everyone). */
export function viewableProvinces(viewer: AuthUser): string[] {
  return viewer.provinces.includes("*") ? ["*", ...ALL_CODES] : viewer.provinces.filter((p) => ALL_CODES.includes(p));
}

/**
 * Every active rep the viewer may see who has shared a position at least once, with their
 * latest fix. A rep who has never reported one has nothing to show on a live map and is left
 * out (a rep whose last fix went stale still appears, as "offline"). `provinceCode` "*" means
 * all of the viewer's provinces.
 */
export async function listLiveReps(viewer: AuthUser, provinceCode: string): Promise<LiveRepDto[]> {
  const allowed = viewableProvinces(viewer).filter((c) => c !== "*");
  const wanted = provinceCode === "*" ? allowed : allowed.includes(provinceCode) ? [provinceCode] : [];
  if (wanted.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      role: "REP",
      status: "ACTIVE",
      ...(viewer.provinces.includes("*") && provinceCode === "*" ? {} : { provinces: { hasSome: wanted } }),
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      provinces: true,
      position: { include: { account: { select: { id: true, businessName: true, city: true } } } },
    },
    orderBy: { displayName: "asc" },
  });
  const reported = users.filter((u) => u.position != null);

  const now = Date.now();
  return reported.map((u) => {
    const position = u.position ? toPositionDto(u.position) : null;
    return {
      id: u.id,
      name: u.displayName,
      email: u.email,
      provinces: u.provinces,
      position,
      status: deriveStatus(position, now),
    };
  });
}
