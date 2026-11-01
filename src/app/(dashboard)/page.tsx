import { TodayRoute } from "@/components/today/TodayRoute";
import { getOptionalSessionUser } from "@/lib/session";
import { hasPermission } from "@/domain/auth/permissions";
import { loadRepDashboard, type RepDashboardDto } from "@/lib/repDashboard";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams;
  // Performance phase 3 — the rep's own day at a glance. Never blocks the map:
  // a failed load just hides the panel.
  let dashboard: RepDashboardDto | null = null;
  try {
    const user = await getOptionalSessionUser();
    if (user && hasPermission(user.role, "performance.view.own")) dashboard = await loadRepDashboard(user);
  } catch (e) {
    console.warn("[today] dashboard unavailable:", e instanceof Error ? e.message : e);
  }
  // Server-side provider modes — displayed so mock/estimated data is never
  // mistaken for live Google data. Values are names only, never keys.
  const serverProviders = {
    placesProvider: (process.env.PLACES_PROVIDER ?? "mock").toLowerCase(),
    routingProvider: (process.env.ROUTING_PROVIDER ?? "geodesic").toLowerCase(),
  };
  return <TodayRoute initialPlanOpen={params.plan === "1"} serverProviders={serverProviders} dashboard={dashboard} />;
}
