"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
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
import type { UserActionResult } from "@/domain/auth/userAdmin";
import { hash } from "bcryptjs";
import type { ClinicIntelligenceDto } from "@/domain/intelligence/clinicIntelligenceDto";
import {
  fetchClinicIntelligence,
  runClinicIntelligenceResearch,
} from "@/lib/clinicIntelligenceService";
import type { EnrichmentResult } from "@/domain/enrichment/types";
import type { CrmOverlaySnapshot } from "@/lib/prospecting";
import {
  getCachedClinicWebProfile,
  runClinicWebProfileResearch,
  type ClinicWebProfileDto,
} from "@/domain/clinicProfile/runClinicProfile";
import { getClinicProfileProvider } from "@/providers/clinicProfile";
import { recomputeRepDailySummary, upsertSalesTarget, deleteSalesTarget, type SalesTargetRow } from "@/lib/performance";
import { DAILY_CLINIC_SLOTS, TARGET_METRICS, TARGET_PERIODS, VISIT_OUTCOME_CODES, VISIT_DURATIONS, isVisitDuration } from "@/domain/performance";

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
  maxRadiusKm: z.coerce.number().min(1).max(500).default(40),
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
      maxRadiusKm: formData.get("maxRadiusKm"),
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

    // Every rep's day has the same shape: ten 45-minute clinic slots, no drive-time
    // limit, and the routing defaults for day hours. Nothing in the form changes that.
    const result = await runProspectSearch({
      ...parsed.data,
      dailyVisitTarget: DAILY_CLINIC_SLOTS,
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
        target: DAILY_CLINIC_SLOTS,
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
  outcomeCode?: string | null;
  /** Minutes at the clinic in 45-minute slots: 45, 90, 135 or 180 (one to four clinics). */
  durationMinutes?: number;
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

    const visitDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Visit date must be YYYY-MM-DD").parse(input.visitDate);
    const outcomeCode = z.enum(VISIT_OUTCOME_CODES).nullable().optional().parse(input.outcomeCode || null);
    const durationMinutes = z
      .number()
      .refine(isVisitDuration, { message: `Time at clinic must be one of ${VISIT_DURATIONS.join(", ")} minutes` })
      .default(45)
      .parse(input.durationMinutes);

    const result = await createVisitRecord({
      ...input,
      visitDate,
      outcomeCode,
      durationMinutes,
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
      metadata: { placeId: input.placeId, visitType: input.visitType, outcomeCode: outcomeCode ?? null, durationMinutes },
    });

    await recomputeRepDailySummary(user.id, visitDate);
    revalidatePath("/visits");
    revalidatePath("/");

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

// ---------------------------------------------------------------------------
// Admin · user management
// ---------------------------------------------------------------------------

const appRoleSchema = z.enum(["REP", "ADMIN"]);
const userStatusSchema = z.enum(["ACTIVE", "DISABLED"]);

const provincesSchema = z
  .array(z.string().trim().toUpperCase())
  .transform((codes) => Array.from(new Set(codes.filter(Boolean))))
  .refine(
    (codes) => codes.every((c) => c === "*" || provinceCodes.includes(c)),
    { message: "Contains an unknown province code" },
  )
  .refine((codes) => !(codes.includes("*") && codes.length > 1), {
    message: 'Use either "*" or a list of provinces, not both',
  });

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long"),
  role: appRoleSchema,
  provinces: provincesSchema.refine((codes) => codes.length > 0, {
    message: "Pick at least one province",
  }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

const updateUserSchema = z.object({
  userId: z.string().min(1),
  role: appRoleSchema.optional(),
  status: userStatusSchema.optional(),
  provinces: provincesSchema.optional(),
  displayName: z.string().trim().min(2).max(80).optional(),
});

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

/** Refuse changes that would leave the system without any active administrator. */
async function assertAnotherActiveAdmin(excludingUserId: string): Promise<void> {
  const remaining = await prisma.user.count({
    where: { role: "ADMIN", status: "ACTIVE", id: { not: excludingUserId } },
  });
  if (remaining === 0) {
    throw new Error("At least one active administrator must remain");
  }
}

export async function adminUpdateUserAction(
  rawInput: z.input<typeof updateUserSchema>,
): Promise<UserActionResult> {
  try {
    const actor = await requireSessionUser();
    requirePermission(actor, "user.manage");

    const parsed = updateUserSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, message: "Check the highlighted fields", fieldErrors: zodFieldErrors(parsed.error) };
    }
    const input = parsed.data;

    const before = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!before) return { ok: false, message: "User not found" };

    const changesRoleOrStatus =
      (input.role !== undefined && input.role !== before.role) ||
      (input.status !== undefined && input.status !== before.status);

    if (before.id === actor.id && changesRoleOrStatus) {
      return { ok: false, message: "You cannot change your own role or status" };
    }

    const losesAdmin =
      before.role === "ADMIN" &&
      before.status === "ACTIVE" &&
      ((input.role !== undefined && input.role !== "ADMIN") || input.status === "DISABLED");
    if (losesAdmin) await assertAnotherActiveAdmin(before.id);

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
        displayName: before.displayName,
      },
      afterState: {
        role: updated.role,
        status: updated.status,
        provinces: updated.provinces,
        displayName: updated.displayName,
      },
    });

    revalidatePath("/admin/users");
    return { ok: true, message: `Updated ${updated.displayName}` };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
  }
}

export async function adminCreateUserAction(
  rawInput: z.input<typeof createUserSchema>,
): Promise<UserActionResult> {
  try {
    const actor = await requireSessionUser();
    requirePermission(actor, "user.manage");

    const parsed = createUserSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, message: "Check the highlighted fields", fieldErrors: zodFieldErrors(parsed.error) };
    }
    const input = parsed.data;

    const passwordHash = await hash(input.password, 10);
    const created = await prisma.user.create({
      data: {
        email: input.email,
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

    revalidatePath("/admin/users");
    return { ok: true, message: `${created.displayName} was added` };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    if (isUniqueViolation(e)) {
      return {
        ok: false,
        message: "Check the highlighted fields",
        fieldErrors: { email: "A user with this email already exists" },
      };
    }
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

// ---------------------------------------------------------------------------
// Clinic contact research (Claude web search) — public contact/identity facts
// ---------------------------------------------------------------------------

const clinicProfileInputSchema = z.object({
  clinicId: z.string().min(1),
  businessName: z.string().min(1),
  provinceCode: z.enum(provinceCodes),
  streetAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  categoryLabel: z.string().optional().nullable(),
  knownWebsite: z.string().optional().nullable(),
  knownPhone: z.string().optional().nullable(),
});

export type ClinicProfileActionInput = z.infer<typeof clinicProfileInputSchema>;

/** Cached profile only — never spends an API call. */
export async function getClinicWebProfileAction(input: {
  clinicId: string;
  provinceCode: string;
}): Promise<{ ok: true; dto: ClinicWebProfileDto } | { ok: false; error: string }> {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "brief.generate");
    requireProvinceAccess(user, input.provinceCode);
    await requireAccountAccess(user, { placeId: input.clinicId, provinceCode: input.provinceCode });
    const dto = await getCachedClinicWebProfile(input.clinicId);
    return { ok: true, dto };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: `${e.code}: ${e.message}` };
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}

/** Runs Claude web research for one clinic and persists the result. */
export async function runClinicWebProfileAction(
  input: ClinicProfileActionInput,
): Promise<{ ok: true; dto: ClinicWebProfileDto } | { ok: false; error: string; dto?: ClinicWebProfileDto }> {
  try {
    const user = await requireSessionUser();
    requirePermission(user, "brief.generate");
    requireProvinceAccess(user, input.provinceCode);
    await requireAccountAccess(user, { placeId: input.clinicId, provinceCode: input.provinceCode });

    const parsed = clinicProfileInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
    }

    const provider = getClinicProfileProvider();
    const dto = await runClinicWebProfileResearch(provider, {
      clinicId: parsed.data.clinicId,
      businessName: parsed.data.businessName,
      provinceCode: parsed.data.provinceCode,
      streetAddress: parsed.data.streetAddress ?? null,
      city: parsed.data.city ?? null,
      postalCode: parsed.data.postalCode ?? null,
      categoryLabel: parsed.data.categoryLabel ?? null,
      knownWebsite: parsed.data.knownWebsite ?? null,
      knownPhone: parsed.data.knownPhone ?? null,
    });

    await writeAuditEvent({
      actor: user,
      action: "brief.generate",
      resourceType: "ClinicWebProfile",
      resourceId: parsed.data.clinicId,
      metadata: {
        state: dto.state,
        provider: dto.provider,
        model: dto.model,
        searchesUsed: dto.searchesUsed,
        ok: dto.state === "READY",
      },
    });

    if (dto.state !== "READY") {
      return { ok: false, error: dto.failureMessage ?? "Clinic research failed", dto };
    }
    return { ok: true, dto };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: `${e.code}: ${e.message}` };
    return { ok: false, error: e instanceof Error ? e.message : "Unexpected error" };
  }
}

// ---------------------------------------------------------------------------
// Performance phase 1 — sales targets (admin)
// ---------------------------------------------------------------------------

const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const salesTargetSchema = z.object({
  userId: z.string().min(1),
  period: z.enum(TARGET_PERIODS),
  metric: z.enum(TARGET_METRICS),
  value: z.coerce.number().int().min(0).max(10_000),
  startsOn: dayKeySchema,
  endsOn: dayKeySchema.nullable().optional(),
  note: z.string().max(200).nullable().optional(),
});

export type SalesTargetActionResult =
  | { ok: true; message: string; target: SalesTargetRow }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** An admin scoped to provinces may only set targets for reps inside them; national admins anywhere. */
async function requireTargetSubject(actor: AuthUserLike, userId: string) {
  const subject = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, provinces: true, status: true },
  });
  if (!subject) throw new AuthError("User not found", "FORBIDDEN");
  if (actor.provinces.includes("*")) return subject;
  const shared = subject.provinces.some((p) => actor.provinces.includes(p));
  if (!shared) throw new AuthError("No access to this user's territory", "TERRITORY");
  return subject;
}

type AuthUserLike = { id: string; provinces: string[] };

export async function setSalesTargetAction(
  rawInput: z.input<typeof salesTargetSchema>,
): Promise<SalesTargetActionResult> {
  try {
    const actor = await requireSessionUser();
    requirePermission(actor, "target.manage");

    const parsed = salesTargetSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { ok: false, message: "Check the highlighted fields", fieldErrors };
    }
    const input = parsed.data;
    if (input.endsOn && input.endsOn < input.startsOn) {
      return { ok: false, message: "End date must be on or after the start date", fieldErrors: { endsOn: "Before start" } };
    }

    const subject = await requireTargetSubject(actor, input.userId);

    const target = await upsertSalesTarget({
      userId: subject.id,
      period: input.period,
      metric: input.metric,
      value: input.value,
      startsOn: input.startsOn,
      endsOn: input.endsOn ?? null,
      note: input.note ?? null,
      createdById: actor.id,
    });

    await writeAuditEvent({
      actor,
      action: "target.set",
      resourceType: "SalesTarget",
      resourceId: target.id,
      afterState: target,
      metadata: { subjectUserId: subject.id, subjectEmail: subject.email },
    });

    revalidatePath("/visits");
    revalidatePath("/admin/users");
    return { ok: true, message: `Target saved for ${subject.email}`, target };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
  }
}

export async function removeSalesTargetAction(targetId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const actor = await requireSessionUser();
    requirePermission(actor, "target.manage");

    const existing = await prisma.salesTarget.findUnique({ where: { id: targetId }, select: { userId: true } });
    if (!existing) return { ok: false, message: "Target not found" };
    await requireTargetSubject(actor, existing.userId);

    const removed = await deleteSalesTarget(targetId);
    if (!removed) return { ok: false, message: "Target not found" };

    await writeAuditEvent({
      actor,
      action: "target.remove",
      resourceType: "SalesTarget",
      resourceId: targetId,
      beforeState: removed,
      metadata: { subjectUserId: removed.userId },
    });

    revalidatePath("/visits");
    revalidatePath("/admin/users");
    return { ok: true, message: "Target removed" };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: `${e.code}: ${e.message}` };
    return { ok: false, message: e instanceof Error ? e.message : "Failed" };
  }
}

