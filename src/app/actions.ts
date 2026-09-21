"use server";

import { z } from "zod";
import { runProspectSearch, type ProspectSearchSuccess } from "@/lib/prospecting";
import { parseWorkingArea } from "@/domain/geo/workingArea";
import { CANADIAN_PROVINCES } from "@/domain/scopeOfPractice";
import { upsertMappingDecision } from "@/lib/crmMappings";
import { createVisitRecord } from "@/lib/visitPersistence";
import { getLlmProvider } from "@/providers";
import { structureVisitNotesWithLlm } from "@/domain/llm/synthesize";
import type { StructuredVisitNotes } from "@/domain/llm/schemas";
import { requireSessionUser } from "@/lib/session";
import {
  AuthError,
  requirePermission,
  requireProvinceAccess,
  requireAccountAccess,
} from "@/lib/authz";
import { writeAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import type { AppRoleName } from "@/domain/auth/permissions";
import { hash } from "bcryptjs";
import type { ClinicIntelligenceDto } from "@/domain/intelligence/clinicIntelligenceDto";
import {
  fetchClinicIntelligence,
  runClinicIntelligenceResearch,
} from "@/lib/clinicIntelligenceService";
import type { EnrichmentResult } from "@/domain/enrichment/types";
import type { CrmOverlaySnapshot } from "@/lib/prospecting";

const provinceCodes = CANADIAN_PROVINCES.map((p) => p.code) as [string, ...string[]];

const optionalNumber = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().optional(),
);

const schema = z.object({
  provinceCode: z.enum(provinceCodes),
  startQuery: z.string().min(2),
  // Phase 8.6 — client-selected start (Places selection / dropped pin / geolocation)
  startLat: optionalNumber,
  startLng: optionalNumber,
  startPlaceId: z.string().optional().nullable(),
  startLabel: z.string().optional().nullable(),
  // Phase 8.6 — drawn working area (JSON array of {lat,lng}); validated below
  workingAreaJson: z.string().optional().nullable(),
  dailyVisitTarget: z.coerce.number().int().min(1).max(50).default(20),
  maxRadiusKm: z.coerce.number().min(1).max(500).default(40),
  maxDriveMinutes: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number().int().min(1).max(300).nullable().optional(),
  ),
  dayStartClock: z.string().optional().nullable(),
  dayEndClock: z.string().optional().nullable(),
  minFitScore: z.coerce.number().int().min(1).max(5).default(3),
  alreadyVisitedRaw: z.string().default("none"),
  revisitsDueRaw: z.string().default("none"),
});

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; data: ProspectSearchSuccess };

function authFail(e: unknown): ActionState {
  if (e instanceof AuthError) {
    return { status: "error", message: `${e.code}: ${e.message}` };
  }
  return { status: "error", message: e instanceof Error ? e.message : "Unexpected error" };
}

export async function generateVisitListAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "prospect.run");

    const parsed = schema.safeParse({
      provinceCode: formData.get("provinceCode"),
      startQuery: formData.get("startQuery"),
      startLat: formData.get("startLat"),
      startLng: formData.get("startLng"),
      startPlaceId: formData.get("startPlaceId") || null,
      startLabel: formData.get("startLabel") || null,
      workingAreaJson: formData.get("workingAreaJson") || null,
      dailyVisitTarget: formData.get("dailyVisitTarget"),
      maxRadiusKm: formData.get("maxRadiusKm"),
      maxDriveMinutes: formData.get("maxDriveMinutes"),
      dayStartClock: formData.get("dayStartClock") || null,
      dayEndClock: formData.get("dayEndClock") || null,
      minFitScore: formData.get("minFitScore"),
      alreadyVisitedRaw: formData.get("alreadyVisitedRaw") || "none",
      revisitsDueRaw: formData.get("revisitsDueRaw") || "none",
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: parsed.error.issues.map((i) => i.message).join("; "),
      };
    }

    requireProvinceAccess(user, parsed.data.provinceCode);

    let workingArea: { lat: number; lng: number }[] | null = null;
    try {
      workingArea = parseWorkingArea(parsed.data.workingAreaJson);
    } catch (e) {
      return {
        status: "error",
        message: e instanceof Error ? e.message : "Invalid working area",
      };
    }

    const startCoords =
      parsed.data.startLat != null && parsed.data.startLng != null
        ? { lat: parsed.data.startLat, lng: parsed.data.startLng }
        : null;

    const result = await runProspectSearch({
      ...parsed.data,
      startCoords,
      workingArea,
      actorUserId: user.id,
      actorDisplayName: user.displayName,
    });
    if (!result.ok) {
      return { status: "error", message: result.error };
    }

    await writeAuditEvent({
      actor: user,
      action: "prospect.run",
      resourceType: "VisitListRun",
      resourceId: result.visitRunId,
      metadata: {
        provinceCode: parsed.data.provinceCode,
        target: parsed.data.dailyVisitTarget,
        qualified: result.qualifiedCount,
      },
    });

    return { status: "success", data: result };
  } catch (e) {
    return authFail(e);
  }
}

export async function resolveCrmMatchAction(input: {
  placeId: string;
  crmExternalId: string;
  matchMethod: string;
  matchConfidence: number;
  decision: "confirm" | "reject";
  comment?: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "mapping.confirm");

    const account = await prisma.account.findFirst({
      where: { placeId: input.placeId },
      select: { id: true, provinceCode: true },
    });
    if (account) {
      requireProvinceAccess(user, account.provinceCode);
    }

    const before = await prisma.crmAccountMapping.findUnique({
      where: {
        crmExternalId_placeId: {
          crmExternalId: input.crmExternalId,
          placeId: input.placeId ?? "",
        },
      },
    });

    await upsertMappingDecision({
      crmExternalId: input.crmExternalId,
      placeId: input.placeId,
      matchMethod: input.matchMethod,
      matchConfidence: input.matchConfidence,
      verified: input.decision === "confirm",
      rejected: input.decision === "reject",
      decidedByUserId: user.id,
      decisionComment: input.comment ?? null,
    });

    await writeAuditEvent({
      actor: user,
      action: `mapping.${input.decision}`,
      resourceType: "CrmAccountMapping",
      resourceId: `${input.crmExternalId}:${input.placeId}`,
      accountId: account?.id ?? null,
      beforeState: before
        ? { verified: before.verified, rejected: before.rejected }
        : null,
      afterState: {
        verified: input.decision === "confirm",
        rejected: input.decision === "reject",
      },
      metadata: { comment: input.comment ?? null, method: input.matchMethod },
    });

    return {
      ok: true,
      message: `${input.decision} ${input.crmExternalId} ↔ ${input.placeId}`,
    };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    return { ok: false, message: e instanceof Error ? e.message : "Mapping update failed" };
  }
}

export async function recordVisitAction(input: {
  placeId: string;
  crmExternalId: string | null;
  visitDate: string;
  visitType: string;
  outcome?: string;
  peopleMet?: string;
  productsDiscussed?: string;
  nextAction?: string;
  followUpDate?: string;
  notes?: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "visit.create");
    await requireAccountAccess(user, { placeId: input.placeId });

    const result = await createVisitRecord({
      ...input,
      createdByUserId: user.id,
      repIdPlaceholder: user.email,
    });
    if ("error" in result) {
      return { ok: false, message: result.error };
    }

    await writeAuditEvent({
      actor: user,
      action: "visit.create",
      resourceType: "VisitRecord",
      resourceId: result.id,
      metadata: { placeId: input.placeId, visitType: input.visitType },
    });

    return { ok: true, message: `Visit saved ${result.id}` };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
  }
}

export async function structureVisitNotesAction(
  rawNotes: string,
  placeId?: string | null,
): Promise<
  | { ok: true; structured: StructuredVisitNotes; provider: string; model: string; cacheHit: boolean }
  | { ok: false; message: string }
> {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "brief.generate");
    if (placeId) {
      await requireAccountAccess(user, { placeId });
    }

    const llm = getLlmProvider();
    if (!llm.isEnabled()) {
      return {
        ok: false,
        message: "LLM disabled — set LLM_PROVIDER=mock or openai to structure notes",
      };
    }
    const result = await structureVisitNotesWithLlm(llm, rawNotes);
    if (!result.ok) {
      return { ok: false, message: result.reason };
    }

    await writeAuditEvent({
      actor: user,
      action: "ai.structure_visit_notes",
      resourceType: "VisitNotes",
      resourceId: placeId ?? null,
      metadata: { provider: result.provider, model: result.model },
    });

    return {
      ok: true,
      structured: result.result,
      provider: result.provider,
      model: result.model,
      cacheHit: result.cacheHit,
    };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
  }
}

export async function assignAccountAction(input: {
  accountId: string;
  userId: string;
  assignmentType?: string;
  territory?: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const actor = await requireSessionUser();
    requirePermission(actor, "account.assign");

    const account = await prisma.account.findUnique({ where: { id: input.accountId } });
    if (!account) return { ok: false, message: "Account not found" };
    requireProvinceAccess(actor, account.provinceCode);

    const row = await prisma.accountAssignment.upsert({
      where: {
        accountId_userId_assignmentType: {
          accountId: input.accountId,
          userId: input.userId,
          assignmentType: input.assignmentType ?? "owner",
        },
      },
      create: {
        accountId: input.accountId,
        userId: input.userId,
        assignmentType: input.assignmentType ?? "owner",
        territory: input.territory ?? account.provinceCode,
        createdById: actor.id,
      },
      update: {
        territory: input.territory ?? account.provinceCode,
        activeTo: null,
      },
    });

    await writeAuditEvent({
      actor,
      action: "account.assign",
      resourceType: "AccountAssignment",
      resourceId: row.id,
      accountId: account.id,
      afterState: { userId: input.userId, type: row.assignmentType },
    });

    return { ok: true, message: `Assigned ${input.userId} → ${account.businessName}` };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
  }
}

export async function adminUpdateUserAction(input: {
  userId: string;
  role?: AppRoleName;
  status?: "ACTIVE" | "DISABLED";
  provinces?: string[];
  displayName?: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const actor = await requireSessionUser();
    requirePermission(actor, "user.manage");

    const before = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!before) return { ok: false, message: "User not found" };

    const updated = await prisma.user.update({
      where: { id: input.userId },
      data: {
        role: input.role,
        status: input.status,
        provinces: input.provinces,
        displayName: input.displayName,
      },
    });

    await writeAuditEvent({
      actor,
      action: "user.update",
      resourceType: "User",
      resourceId: updated.id,
      beforeState: {
        role: before.role,
        status: before.status,
        provinces: before.provinces,
      },
      afterState: {
        role: updated.role,
        status: updated.status,
        provinces: updated.provinces,
      },
    });

    return { ok: true, message: `Updated ${updated.email}` };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
  }
}

export async function adminCreateUserAction(input: {
  email: string;
  displayName: string;
  role: AppRoleName;
  provinces: string[];
  password: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const actor = await requireSessionUser();
    requirePermission(actor, "user.manage");

    const passwordHash = await hash(input.password, 10);
    const created = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        role: input.role,
        provinces: input.provinces,
        passwordHash,
        status: "ACTIVE",
      },
    });

    await writeAuditEvent({
      actor,
      action: "user.create",
      resourceType: "User",
      resourceId: created.id,
      afterState: { email: created.email, role: created.role, provinces: created.provinces },
    });

    return { ok: true, message: `Created ${created.email}` };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
  }
}

const intelligenceInputSchema = z.object({
  clinicId: z.string().min(1),
  businessName: z.string().min(1),
  provinceCode: z.enum(provinceCodes),
  segmentNumber: z.coerce.number().int().min(1).max(6),
  categoryLabel: z.string().min(1),
  websiteUrl: z.string().nullable().optional(),
  fitScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
  forceRefresh: z.coerce.boolean().optional(),
  enrichmentJson: z.string().optional().nullable(),
  crmJson: z.string().optional().nullable(),
});

function parseIntelligencePayload(parsed: z.infer<typeof intelligenceInputSchema>): {
  enrichment: EnrichmentResult | null;
  crm: CrmOverlaySnapshot | null;
} {
  let enrichment: EnrichmentResult | null = null;
  let crm: CrmOverlaySnapshot | null = null;
  if (parsed.enrichmentJson) {
    try {
      enrichment = JSON.parse(parsed.enrichmentJson) as EnrichmentResult;
    } catch {
      enrichment = null;
    }
  }
  if (parsed.crmJson) {
    try {
      crm = JSON.parse(parsed.crmJson) as CrmOverlaySnapshot;
    } catch {
      crm = null;
    }
  }
  return { enrichment, crm };
}

export async function getClinicIntelligenceAction(input: {
  clinicId: string;
  businessName: string;
  provinceCode: string;
  segmentNumber: number;
  categoryLabel: string;
  websiteUrl?: string | null;
  fitScore?: number | null;
  enrichmentJson?: string | null;
  crmJson?: string | null;
}): Promise<{ ok: true; dto: ClinicIntelligenceDto } | { ok: false; error: string }> {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "brief.view");
    requireProvinceAccess(user, input.provinceCode);
    await requireAccountAccess(user, {
      placeId: input.clinicId,
      provinceCode: input.provinceCode,
    });

    const parsed = intelligenceInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
    }

    const { enrichment, crm } = parseIntelligencePayload(parsed.data);
    const dto = await fetchClinicIntelligence({
      clinicId: parsed.data.clinicId,
      businessName: parsed.data.businessName,
      provinceCode: parsed.data.provinceCode,
      segmentNumber: parsed.data.segmentNumber,
      categoryLabel: parsed.data.categoryLabel,
      websiteUrl: parsed.data.websiteUrl ?? null,
      fitScore: parsed.data.fitScore ?? null,
      enrichment,
      crm,
      role: user.role,
    });

    return { ok: true, dto };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: `${e.code}: ${e.message}` };
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}

export async function runClinicResearchAction(input: {
  clinicId: string;
  businessName: string;
  provinceCode: string;
  segmentNumber: number;
  categoryLabel: string;
  websiteUrl?: string | null;
  fitScore?: number | null;
  forceRefresh?: boolean;
  enrichmentJson?: string | null;
  crmJson?: string | null;
}): Promise<{ ok: true; dto: ClinicIntelligenceDto } | { ok: false; error: string; dto?: ClinicIntelligenceDto }> {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "brief.generate");
    requireProvinceAccess(user, input.provinceCode);
    await requireAccountAccess(user, {
      placeId: input.clinicId,
      provinceCode: input.provinceCode,
    });

    const parsed = intelligenceInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
    }

    const { enrichment, crm } = parseIntelligencePayload(parsed.data);
    const result = await runClinicIntelligenceResearch({
      clinicId: parsed.data.clinicId,
      businessName: parsed.data.businessName,
      provinceCode: parsed.data.provinceCode,
      segmentNumber: parsed.data.segmentNumber,
      categoryLabel: parsed.data.categoryLabel,
      websiteUrl: parsed.data.websiteUrl ?? null,
      fitScore: parsed.data.fitScore ?? null,
      enrichment,
      crm,
      forceRefresh: parsed.data.forceRefresh ?? false,
      role: user.role,
    });

    await writeAuditEvent({
      actor: user,
      action: "brief.generate",
      resourceType: "ClinicIntelligence",
      resourceId: parsed.data.clinicId,
      metadata: {
        researchState: result.dto.researchState,
        primaryProduct: result.dto.primary?.productId ?? null,
        ok: result.ok,
      },
    });

    if (!result.ok) {
      return { ok: false, error: result.error ?? "Research failed", dto: result.dto };
    }
    return { ok: true, dto: result.dto };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: `${e.code}: ${e.message}` };
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}
