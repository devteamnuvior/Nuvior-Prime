"use client";

import { useState, useTransition } from "react";
import type { MatchResult } from "@/domain/crm/matching";
import { resolveCrmMatchAction } from "@/app/actions";

export function MatchingQueuePanel({
  items,
}: {
  items: { placeId: string; businessName: string; match: MatchResult }[];
}) {
  const [pending, start] = useTransition();
  const [messages, setMessages] = useState<string[]>([]);

  if (items.length === 0) {
    return (
      <div className="border border-rule bg-panel p-5 text-sm text-muted">
        Matching queue empty — no POSSIBLE / CONFLICT matches this run.
      </div>
    );
  }

  return (
    <div className="border border-rule bg-panel p-5">
      <h3
        className="mb-3 text-[0.75rem] font-semibold tracking-[0.14em] text-muted uppercase"
        style={{ fontFamily: "var(--display)" }}
      >
        CRM matching queue (dev)
      </h3>
      <p className="mb-3 text-xs text-muted">
        Uncertain matches are not auto-merged. Confirm, reject, or leave unresolved.
      </p>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.placeId} className="border border-rule-soft p-3">
            <div className="font-semibold text-sm">{item.businessName}</div>
            <div className="font-mono text-[0.68rem] text-muted">
              {item.match.state} · {item.match.method} · conf={item.match.confidence.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-muted">{item.match.reason}</div>
            <ul className="mt-2 font-mono text-[0.65rem] text-muted">
              {item.match.candidates.map((c) => (
                <li key={c.crmExternalId}>
                  {c.crmExternalId} ({c.method} {c.confidence.toFixed(2)})
                  <div className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="border border-accent px-2 py-0.5 text-accent"
                      onClick={() =>
                        start(async () => {
                          const r = await resolveCrmMatchAction({
                            placeId: item.placeId,
                            crmExternalId: c.crmExternalId,
                            matchMethod: c.method,
                            matchConfidence: c.confidence,
                            decision: "confirm",
                          });
                          setMessages((m) => [...m, r.message]);
                        })
                      }
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="border border-rule px-2 py-0.5 text-muted"
                      onClick={() =>
                        start(async () => {
                          const r = await resolveCrmMatchAction({
                            placeId: item.placeId,
                            crmExternalId: c.crmExternalId,
                            matchMethod: c.method,
                            matchConfidence: c.confidence,
                            decision: "reject",
                          });
                          setMessages((m) => [...m, r.message]);
                        })
                      }
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {messages.length > 0 && (
        <ul className="mt-3 font-mono text-[0.65rem] text-accent">
          {messages.map((m, i) => (
            <li key={`${i}-${m}`}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
