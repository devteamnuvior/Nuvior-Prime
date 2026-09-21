"use client";

import { useMemo, useState } from "react";
import type { VerificationItem } from "@/domain/enrichment/types";

export function VerificationQueuePanel({ items }: { items: VerificationItem[] }) {
  const [account, setAccount] = useState("");
  const [field, setField] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (account && !i.accountName.toLowerCase().includes(account.toLowerCase())) return false;
      if (field && !i.fieldPath.toLowerCase().includes(field.toLowerCase())) return false;
      if (status && i.status !== status) return false;
      if (source && i.sourceType !== source) return false;
      return true;
    });
  }, [items, account, field, status, source]);

  if (items.length === 0) return null;

  return (
    <div className="border border-rule bg-panel p-5">
      <h3
        className="mb-3 text-[0.75rem] font-semibold tracking-[0.14em] text-muted uppercase"
        style={{ fontFamily: "var(--display)" }}
      >
        Verification queue (dev) · {filtered.length}/{items.length}
      </h3>
      <div className="mb-3 grid gap-2 sm:grid-cols-4">
        <input
          placeholder="Filter account"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="border border-rule bg-paper px-2 py-1 font-mono text-xs"
        />
        <input
          placeholder="Filter field"
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="border border-rule bg-paper px-2 py-1 font-mono text-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-rule bg-paper px-2 py-1 font-mono text-xs"
        >
          <option value="">All statuses</option>
          <option value="CONFLICT">CONFLICT</option>
          <option value="AMBIGUOUS">AMBIGUOUS</option>
          <option value="UNKNOWN">UNKNOWN</option>
          <option value="MANUAL_VERIFY">MANUAL_VERIFY</option>
          <option value="DERIVED">DERIVED</option>
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="border border-rule bg-paper px-2 py-1 font-mono text-xs"
        >
          <option value="">All sources</option>
          <option value="website">website</option>
          <option value="places">places</option>
          <option value="aggregation">aggregation</option>
          <option value="mock">mock</option>
        </select>
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-rule font-mono text-[0.65rem] text-muted uppercase">
              <th className="py-1 pr-2">Account</th>
              <th className="py-1 pr-2">Field</th>
              <th className="py-1 pr-2">Status</th>
              <th className="py-1 pr-2">Reason</th>
              <th className="py-1">Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((i, idx) => (
              <tr key={`${i.accountId}-${i.fieldPath}-${idx}`} className="border-b border-rule-soft align-top">
                <td className="py-1.5 pr-2">{i.accountName}</td>
                <td className="py-1.5 pr-2 font-mono">{i.fieldPath}</td>
                <td className="py-1.5 pr-2 font-mono text-signal">{i.status}</td>
                <td className="py-1.5 pr-2 text-muted">{i.reason}</td>
                <td className="py-1.5">{i.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
