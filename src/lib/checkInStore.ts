import { prisma } from "@/lib/prisma";
import type { CheckInDto } from "@/domain/visits/checkIn";

type Row = { id: string; placeId: string; checkedInAt: Date; checkedOutAt: Date | null };

function toDto(row: Row): CheckInDto {
  return { id: row.id, placeId: row.placeId, checkedInAt: row.checkedInAt.toISOString(), checkedOutAt: row.checkedOutAt?.toISOString() ?? null };
}

/** The rep's one open check-in, if any. */
export async function getOpenCheckIn(userId: string): Promise<CheckInDto | null> {
  const row = await prisma.clinicCheckIn.findFirst({ where: { userId, checkedOutAt: null }, orderBy: { checkedInAt: "desc" } });
  return row ? toDto(row) : null;
}

/**
 * Opens a check-in at a clinic. Any other open check-in for this rep is closed
 * first (they left without checking out), so there is never more than one.
 */
export async function openCheckIn(input: {
  userId: string;
  placeId: string;
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
}): Promise<CheckInDto> {
  const account = await prisma.account.findFirst({ where: { placeId: input.placeId }, select: { id: true } });
  const now = new Date();
  const [, row] = await prisma.$transaction([
    prisma.clinicCheckIn.updateMany({ where: { userId: input.userId, checkedOutAt: null }, data: { checkedOutAt: now } }),
    prisma.clinicCheckIn.create({
      data: {
        userId: input.userId,
        placeId: input.placeId,
        accountId: account?.id ?? null,
        checkedInAt: now,
        lat: input.lat,
        lng: input.lng,
        distanceM: input.distanceM,
      },
    }),
  ]);
  return toDto(row);
}

/** Closes a check-in; idempotent. Returns null when it is not this rep's. */
export async function closeCheckIn(userId: string, checkInId: string): Promise<CheckInDto | null> {
  const row = await prisma.clinicCheckIn.findFirst({ where: { id: checkInId, userId } });
  if (!row) return null;
  if (row.checkedOutAt) return toDto(row);
  const updated = await prisma.clinicCheckIn.update({ where: { id: row.id }, data: { checkedOutAt: new Date() } });
  return toDto(updated);
}

/** Links the visit record the rep saved after checking out. Closes the check-in if it is still open. */
export async function attachVisitToCheckIn(userId: string, checkInId: string, visitRecordId: string): Promise<void> {
  const row = await prisma.clinicCheckIn.findFirst({ where: { id: checkInId, userId }, select: { id: true, checkedOutAt: true } });
  if (!row) return;
  await prisma.clinicCheckIn.update({
    where: { id: row.id },
    data: { visitRecordId, ...(row.checkedOutAt ? {} : { checkedOutAt: new Date() }) },
  });
}
