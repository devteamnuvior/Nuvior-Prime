"use client";

import type { EnrichmentResult, EvidenceRecord } from "@/domain/enrichment/types";

export function EvidenceInspector({
  accountName,
  evidence,
  enrichment,
}: {
  accountName: string;
  evidence: EvidenceRecord[];
  enrichment?: EnrichmentResult;
}) {
  if (evidence.length === 0 && !enrichment) return null;

  return (
    <div className="border border-rule bg-panel p-5">
      <h3
        className="mb-3 text-[0.75rem] font-semibold tracking-[0.14em] text-muted uppercase"
        style={{ fontFamily: "var(--display)" }}
      >
        Evidence inspector · {accountName}
      </h3>
      {enrichment && (
        <p className="mb-3 font-mono text-[0.68rem] text-muted">
          website={enrichment.website ?? "none"} · pages={enrichment.pagesFetched} ·
          skipped={String(enrichment.skipped)}
          {enrichment.skipReason ? ` (${enrichment.skipReason})` : ""}
        </p>
      )}
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-rule font-mono text-[0.65rem] text-muted uppercase">
              <th className="py-1 pr-2">Field</th>
              <th className="py-1 pr-2">Value</th>
              <th className="py-1 pr-2">State</th>
              <th className="py-1 pr-2">Source</th>
              <th className="py-1">Snippet</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((e, idx) => (
              <tr key={`${e.fieldPath}-${idx}`} className="border-b border-rule-soft align-top">
                <td className="py-1.5 pr-2 font-mono">{e.fieldPath}</td>
                <td className="py-1.5 pr-2">{e.value}</td>
                <td className="py-1.5 pr-2 font-mono">{e.verificationState}</td>
                <td className="py-1.5 pr-2">
                  <div>{e.sourceType}</div>
                  {e.sourceUrl ? (
                    <div className="truncate text-muted" title={e.sourceUrl}>
                      {e.sourceUrl}
                    </div>
                  ) : null}
                </td>
                <td className="py-1.5 text-muted">{e.snippet}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
