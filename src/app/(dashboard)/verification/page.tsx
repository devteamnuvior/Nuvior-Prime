import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { VerificationTable, type VerificationRow } from "@/components/verification/VerificationTable";

export default async function VerificationPage() {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "verification.review");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const provinceFilter = user.provinces.includes("*") ? undefined : { in: user.provinces };
  const items = await prisma.fieldEvidence.findMany({
    where: {
      needsVerification: true,
      ...(provinceFilter ? { account: { provinceCode: provinceFilter } } : {}),
    },
    orderBy: { capturedAt: "desc" },
    take: 100,
    include: { account: { select: { businessName: true, city: true, provinceCode: true } } },
  });

  const rows: VerificationRow[] = items.map((i) => ({
    id: i.id,
    accountName: i.account.businessName,
    location: `${i.account.city}, ${i.account.provinceCode}`,
    capturedAt: i.capturedAt.toISOString(),
    fieldPath: i.fieldPath,
    valueSnapshot: i.valueSnapshot,
    sourceType: i.sourceType,
    sourceUrl: i.sourceUrl ?? null,
    sourceTitle: i.sourceTitle ?? null,
  }));

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Verification"
        description="Fields that could not be confirmed from public or internal sources. Items surfaced during a route run also appear under Run diagnostics on Today's Route."
      />
      <VerificationTable rows={rows} />
    </PageContainer>
  );
}
