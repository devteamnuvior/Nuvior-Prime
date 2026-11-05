import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { loadLiveSnapshot } from "@/lib/livePositions";

/** Polled by the live map: every rep the viewer may see with their latest position and today's target progress. */
export async function GET(req: Request) {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "position.view.team");
  } catch (e) {
    const code = e instanceof AuthError ? e.code : "UNAUTHENTICATED";
    return NextResponse.json({ error: code }, { status: code === "UNAUTHENTICATED" ? 401 : 403 });
  }

  const province = new URL(req.url).searchParams.get("province") ?? "*";
  const snapshot = await loadLiveSnapshot(user, province);
  return NextResponse.json({ ...snapshot, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
