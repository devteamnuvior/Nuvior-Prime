import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountsTable, type AccountRow } from "@/components/accounts/AccountsTable";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  let user;
  try {
    user = await requireSessionUser();
    requirePermission(user, "prospect.view");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const { q } = await searchParams;
  const provinceFilter = user.provinces.includes("*") ? undefined : { in: user.provinces };

  const accounts = await prisma.account.findMany({
    where: {
      ...(provinceFilter ? { provinceCode: provinceFilter } : {}),
      ...(q ? { businessName: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
    include: {
      qualifications: { orderBy: { computedAt: "desc" }, take: 1 },
      publicProfile: { select: { website: true, googleRating: true } },
    },
  });

  const rows: AccountRow[] = accounts.map((a) => {
    const qual = a.qualifications[0];
    return {
      id: a.id,
      businessName: a.businessName,
      needsVerification: a.dataCompleteness === "needs_verification",
      categoryLabel: a.categoryLabel,
      segment: `${a.segmentNumber}.${a.categoryNumber}`,
      address: `${a.streetAddress}, ${a.city} ${a.provinceCode} ${a.postalCode}`,
      city: a.city,
      provinceCode: a.provinceCode,
      leadProduct: qual?.recommendedLeadProduct ?? null,
      rating: a.publicProfile?.googleRating ?? null,
      website: a.publicProfile?.website ?? null,
      googleMapsUrl: a.googleMapsUrl ?? null,
    };
  });

  return (
    <PageContainer>
      <PageHeader
        title="Prospecting"
        description="Account research in your territory. Use Today to build the day's route; this page is for deeper discovery. Lead product reflects the latest qualification run."
      />
      <AccountsTable rows={rows} query={q ?? ""} />
    </PageContainer>
  );
}
