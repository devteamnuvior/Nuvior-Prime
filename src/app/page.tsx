import { AppShell } from "@/components/AppShell";
import { TodayRoute } from "@/components/today/TodayRoute";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  // Server-side provider modes — displayed so mock/estimated data is never
  // mistaken for live Google data. Values are names only, never keys.
  const serverProviders = {
    placesProvider: (process.env.PLACES_PROVIDER ?? "mock").toLowerCase(),
    routingProvider: (process.env.ROUTING_PROVIDER ?? "geodesic").toLowerCase(),
  };
  return (
    <AppShell title="Today's Route" fullBleed>
      <TodayRoute initialPlanOpen={params.plan === "1"} serverProviders={serverProviders} />
    </AppShell>
  );
}
