import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import { listLiveReps, viewableProvinces } from "@/lib/livePositions";
import { LiveMap } from "@/components/live/LiveMap";

export const dynamic = "force-dynamic";

/** Admin live map: every rep's last known position, refreshed in the browser. */
export default async function LiveMapPage({ searchParams }: { searchParams: Promise<{ province?: string }> }) {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "position.view.team");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const sp = await searchParams;
  const allowed = viewableProvinces(user);
  const provinceCode = sp.province && allowed.includes(sp.province) ? sp.province : user.provinces.includes("*") ? "*" : (allowed[0] ?? "*");
  const reps = await listLiveReps(user, provinceCode);

  return (
    <LiveMap
      initialReps={reps}
      provinceCode={provinceCode}
      provinceOptions={allowed.map((c) => ({ code: c, name: c === "*" ? "All provinces" : (CANADIAN_PROVINCES.find((p) => p.code === c)?.name ?? c) }))}
    />
  );
}
