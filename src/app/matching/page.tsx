import { AppShell } from "@/components/AppShell";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MatchingAdminPanel } from "@/components/MatchingAdminPanel";

export default async function MatchingPage() {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "mapping.review");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const mappings = await prisma.crmAccountMapping.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <AppShell title="Account Matching">
      <MatchingAdminPanel
        mappings={mappings.map((m) => ({
          id: m.id,
          crmExternalId: m.crmExternalId,
          placeId: m.placeId,
          matchMethod: m.matchMethod,
          matchConfidence: m.matchConfidence,
          verified: m.verified,
          rejected: m.rejected,
        }))}
      />
    </AppShell>
  );
}
