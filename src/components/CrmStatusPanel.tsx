"use client";

import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { CrmOverlaySnapshot } from "@/lib/prospecting";

const MONO = { fontFamily: "var(--mono)", fontSize: "0.65rem", letterSpacing: "0.04em" } as const;

export function CrmStatusPanel({
  accountName,
  overlay,
}: {
  accountName: string;
  overlay: CrmOverlaySnapshot | undefined;
}) {
  if (!overlay) {
    return (
      <Paper variant="outlined" sx={{ p: 5 }}>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          No CRM overlay for {accountName}.
        </Typography>
      </Paper>
    );
  }

  const row = (label: string, value: string | null | boolean | undefined, source: string) => (
    <TableRow key={label} sx={{ "&:last-of-type td": { borderBottom: 0 } }}>
      <TableCell component="th" scope="row" sx={{ ...MONO, px: 0, py: 1.5, pr: 3, textTransform: "uppercase", color: "text.secondary", fontWeight: 400, whiteSpace: "nowrap" }}>
        {label}
      </TableCell>
      <TableCell sx={{ px: 0, py: 1.5, pr: 3 }}>
        {value === null || value === undefined ? "unavailable / unknown" : String(value)}
      </TableCell>
      <TableCell sx={{ ...MONO, px: 0, py: 1.5, color: "primary.main", whiteSpace: "nowrap" }}>{source}</TableCell>
    </TableRow>
  );

  return (
    <Paper variant="outlined" sx={{ p: 5 }}>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 3, color: "text.secondary" }}>
        CRM / internal status (dev)
      </Typography>
      {overlay.crmUnverified && (
        <Alert severity="warning" icon={false} sx={{ mb: 3 }}>
          Internal status not verified — absence of CRM data is not proof safe to contact.
        </Alert>
      )}
      {overlay.crmStale && (
        <Alert severity="info" icon={false} sx={{ mb: 3 }}>
          CRM mirror may be stale — refresh import before relying on freshness.
        </Alert>
      )}
      <Typography variant="caption" sx={{ display: "block", mb: 2, fontFamily: "var(--mono)", color: "text.secondary" }}>
        source={overlay.crmSource ?? "?"} · {overlay.dncDebug}
      </Typography>
      <Table size="small" aria-label="CRM overlay fields" sx={{ "& td, & th": { fontSize: "0.8125rem" } }}>
        <TableBody>
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
        </TableBody>
      </Table>
    </Paper>
  );
}
