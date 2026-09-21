"use client";

import { useState, useTransition } from "react";
import { resolveCrmMatchAction } from "@/app/actions";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/domain/auth/permissions";

type MappingRow = {
  id: string;
  crmExternalId: string;
  placeId: string;
  matchMethod: string;
  matchConfidence: number;
  verified: boolean;
  rejected: boolean;
};

export function MatchingAdminPanel({ mappings }: { mappings: MappingRow[] }) {
  const { data } = useSession();
  const canConfirm = data?.user?.role
    ? hasPermission(data.user.role, "mapping.confirm")
    : false;
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="border border-rule bg-panel p-4">
      <p className="mb-3 text-sm text-muted">
        Confirm/reject requires mapping.confirm. All decisions are audited.
      </p>
      <ul className="space-y-3 text-sm">
        {mappings.map((m) => (
          <li key={m.id} className="border border-rule-soft p-3">
            <div className="font-mono text-xs">
              {m.crmExternalId} ↔ {m.placeId || "(no place)"} · {m.matchMethod} @{" "}
              {m.matchConfidence.toFixed(2)}
            </div>
            <div className="text-xs text-muted">
              verified={String(m.verified)} rejected={String(m.rejected)}
            </div>
            {canConfirm && !m.verified && !m.rejected && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  className="border border-accent px-2 py-0.5 text-xs text-accent"
                  onClick={() =>
                    start(async () => {
                      const r = await resolveCrmMatchAction({
                        placeId: m.placeId,
                        crmExternalId: m.crmExternalId,
                        matchMethod: m.matchMethod,
                        matchConfidence: m.matchConfidence,
                        decision: "confirm",
                      });
                      setMsg(r.message);
                    })
                  }
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="border border-rule px-2 py-0.5 text-xs"
                  onClick={() =>
                    start(async () => {
                      const r = await resolveCrmMatchAction({
                        placeId: m.placeId,
                        crmExternalId: m.crmExternalId,
                        matchMethod: m.matchMethod,
                        matchConfidence: m.matchConfidence,
                        decision: "reject",
                      });
                      setMsg(r.message);
                    })
                  }
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
        {mappings.length === 0 && <li className="text-muted">No mappings yet.</li>}
      </ul>
      {msg && <p className="mt-3 font-mono text-xs text-accent">{msg}</p>}
    </div>
  );
}
