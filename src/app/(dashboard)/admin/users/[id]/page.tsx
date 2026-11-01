import { notFound, redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { AuthError, requirePermission } from "@/lib/authz";
import { hasPermission } from "@/domain/auth/permissions";
import { loadRepProfile } from "@/lib/repProfile";
import type { RangeKey } from "@/domain/performance";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { RepProfileView } from "@/components/admin/rep/RepProfileView";

const RANGES: RangeKey[] = ["30", "90", "365"];

export default async function AdminUserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  let viewer;
  try {
    viewer = await requireSessionUser();
    requirePermission(viewer, "performance.view.team");
  } catch (e) {
    if (e instanceof AuthError && e.code === "UNAUTHENTICATED") redirect("/login");
    redirect("/");
  }

  const { id } = await params;
  const sp = await searchParams;
  const rangeKey: RangeKey = RANGES.includes(sp.range as RangeKey) ? (sp.range as RangeKey) : "90";

  const profile = await loadRepProfile(id, rangeKey);
  if (!profile) notFound();

  // Managers only see reps who share one of their provinces; admins (*) see everyone.
  const sharesTerritory = viewer.provinces.includes("*") || profile.user.provinces.some((p) => viewer.provinces.includes(p));
  if (!sharesTerritory) redirect(hasPermission(viewer.role, "user.manage") ? "/admin/users" : "/team");

  const canManageTargets = hasPermission(viewer.role, "target.manage");
  const showAdminTabs = hasPermission(viewer.role, "user.manage");

  return (
    <PageContainer>
      {showAdminTabs && <AdminTabs />}
      <RepProfileView profile={profile} canManageTargets={canManageTargets} viewerId={viewer.id} renderedAt={Date.now()} />
    </PageContainer>
  );
}
