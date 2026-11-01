import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { recordPosition } from "@/lib/livePositions";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(100_000).nullable().optional(),
  headingDeg: z.number().min(0).max(360).nullable().optional(),
  speedMps: z.number().min(0).max(200).nullable().optional(),
  recordedAt: z.string().datetime().nullable().optional(),
});

/** The rep client posts its latest GPS fix here while "Share live location" is on. */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "position.report");
  } catch (e) {
    const code = e instanceof AuthError ? e.code : "UNAUTHENTICATED";
    return NextResponse.json({ error: code }, { status: code === "UNAUTHENTICATED" ? 401 : 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID", issues: parsed.error.issues }, { status: 400 });

  const position = await recordPosition(user, parsed.data);
  return NextResponse.json({ position }, { headers: { "Cache-Control": "no-store" } });
}
