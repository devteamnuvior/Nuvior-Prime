import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/domain/auth/permissions";
import type { Prisma } from "@prisma/client";

export type AuditWriteInput = {
  actor: AuthUser | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  accountId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: unknown;
  sessionId?: string | null;
};

/**
 * Append-only audit writer. Never updates/deletes existing events.
 */
export async function writeAuditEvent(input: AuditWriteInput): Promise<string | null> {
  try {
    const row = await prisma.auditEvent.create({
      data: {
        actorUserId: input.actor?.id ?? null,
        actorRoleSnapshot: input.actor?.role ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        accountId: input.accountId ?? null,
        beforeState: (input.beforeState ?? undefined) as Prisma.InputJsonValue | undefined,
        afterState: (input.afterState ?? undefined) as Prisma.InputJsonValue | undefined,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        sessionId: input.sessionId ?? null,
      },
    });
    return row.id;
  } catch (e) {
    console.warn("[audit] failed to write event", e instanceof Error ? e.message : e);
    return null;
  }
}
