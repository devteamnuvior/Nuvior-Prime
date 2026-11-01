import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchingAdminPanel } from "@/components/MatchingAdminPanel";

export default async function MatchingPage() {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "mapping.review");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const mappings = await prisma.crmAccountMapping.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Account Matching"
        description="Review how CRM accounts were matched to discovered places. Confirming or rejecting requires the mapping.confirm permission; every decision is audited."
      />
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
    </PageContainer>
  );
}
