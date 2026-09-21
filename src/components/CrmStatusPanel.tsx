"use client";

import type { CrmOverlaySnapshot } from "@/lib/prospecting";

export function CrmStatusPanel({
  accountName,
  overlay,
}: {
  accountName: string;
  overlay: CrmOverlaySnapshot | undefined;
}) {
  if (!overlay) {
    return (
      <div className="border border-rule bg-panel p-5 text-sm text-muted">
        No CRM overlay for {accountName}.
      </div>
    );
  }

  const row = (label: string, value: string | null | boolean | undefined, source: string) => (
    <tr className="border-b border-rule-soft">
      <td className="py-1.5 pr-3 font-mono text-[0.65rem] text-muted uppercase">{label}</td>
      <td className="py-1.5 pr-3 text-sm">
        {value === null || value === undefined ? "unavailable / unknown" : String(value)}
      </td>
      <td className="py-1.5 font-mono text-[0.65rem] text-accent">{source}</td>
    </tr>
  );

  return (
    <div className="border border-rule bg-panel p-5">
      <h3
        className="mb-3 text-[0.75rem] font-semibold tracking-[0.14em] text-muted uppercase"
        style={{ fontFamily: "var(--display)" }}
      >
        CRM / internal status (dev)
      </h3>
      {overlay.crmUnverified && (
        <p className="mb-3 border border-[#E5D3BC] bg-signal-tint p-2 text-xs text-signal">
          Internal status not verified — absence of CRM data is not proof safe to contact.
        </p>
      )}
      {overlay.crmStale && (
        <p className="mb-3 border border-rule bg-panel-soft p-2 text-xs text-muted">
          CRM mirror may be stale — refresh import before relying on freshness.
        </p>
      )}
      <p className="mb-2 font-mono text-[0.68rem] text-muted">
        source={overlay.crmSource ?? "?"} · {overlay.dncDebug}
      </p>
      <table className="w-full text-left">
        <tbody>
          {row("Match state", `${overlay.match.state} (${overlay.match.method})`, "derived match")}
          {row("Confidence", overlay.match.confidence.toFixed(2), "derived match")}
          {row("CRM ID", overlay.crmExternalId, "crm")}
          {row("Internal status", overlay.internalStatus, "crm")}
          {row("Academy", overlay.hasAcademyAccount, "crm")}
          {row("Certification", overlay.aptosCertificationLevel, "crm")}
          {row("Pathway", overlay.aptosPathway, "crm")}
          {row("Former Mesoestetic", overlay.formerMesoesteticCustomer, "crm")}
          {row("Last order", overlay.lastOrderDate, "crm")}
          {row("Last-order status", overlay.lastOrderStatus, "derived")}
          {row("Last visit", overlay.lastVisitDate, "crm")}
          {row("Revisit due", overlay.nextRevisitDueDate, "crm")}
          {row("DNC", overlay.doNotContact, "crm")}
          {row("DNC verified", overlay.dncVerified, "crm")}
        </tbody>
      </table>
    </div>
  );
}
