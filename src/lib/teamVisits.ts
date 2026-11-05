/**
 * Team visit marks for route planning: which of the discovered clinics anyone on
 * the team (the rep included) has logged a visit to recently. The planner skips
 * those, shows them on the map as visited, and fills the day with other clinics.
 */

import { prisma } from "@/lib/prisma";
import { dayKey } from "@/domain/performance";
import { TEAM_VISIT_LOOKBACK_DAYS, type TeamVisitMark } from "@/domain/visitList";

/** Latest visit per place id within the lookback window. Never throws: planning must not fail on this. */
export async function loadTeamVisits(placeIds: string[], actorUserId: string | null, now = new Date()): Promise<Record<string, TeamVisitMark>> {
  const ids = Array.from(new Set(placeIds.filter(Boolean)));
  if (!ids.length) return {};
  try {
    const since = new Date(now.getTime() - TEAM_VISIT_LOOKBACK_DAYS * 86_400_000);
    const rows = await prisma.visitRecord.findMany({
      where: { visitDate: { gte: since }, OR: [{ placeId: { in: ids } }, { account: { placeId: { in: ids } } }] },
      orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
      select: {
        placeId: true,
        visitDate: true,
        createdByUserId: true,
        createdByUser: { select: { displayName: true } },
        account: { select: { placeId: true } },
      },
    });
    const out: Record<string, TeamVisitMark> = {};
    for (const r of rows) {
      const key = r.placeId ?? r.account?.placeId ?? null;
      if (!key || out[key]) continue;
      out[key] = {
        visitedOn: dayKey(r.visitDate),
        byUserId: r.createdByUserId,
        byName: r.createdByUser?.displayName ?? "a teammate",
        mine: actorUserId != null && r.createdByUserId === actorUserId,
      };
    }
    return out;
  } catch (e) {
    console.warn("[teamVisits] lookup failed:", e instanceof Error ? e.message : e);
    return {};
  }
}
