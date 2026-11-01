"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { EnrichmentResult, EvidenceRecord } from "@/domain/enrichment/types";

const MONO = { fontFamily: "var(--mono)", fontSize: "0.7rem" } as const;

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
    <Paper variant="outlined" sx={{ p: 5 }}>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 3, color: "text.secondary" }}>
        Evidence inspector · {accountName}
      </Typography>
      {enrichment && (
        <Typography variant="caption" sx={{ display: "block", mb: 3, fontFamily: "var(--mono)", color: "text.secondary" }}>
          website={enrichment.website ?? "none"} · pages={enrichment.pagesFetched} ·
          skipped={String(enrichment.skipped)}
          {enrichment.skipReason ? ` (${enrichment.skipReason})` : ""}
        </Typography>
      )}
      <Box className="nv-scroll" sx={{ maxHeight: 320, overflow: "auto" }}>
        <Table size="small" stickyHeader aria-label="Evidence records" sx={{ "& td, & th": { px: 2, py: 1.5, fontSize: "0.75rem", verticalAlign: "top" }, "& td:first-of-type, & th:first-of-type": { pl: 0 } }}>
          <TableHead>
            <TableRow>
              <TableCell>Field</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Snippet</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {evidence.map((e, idx) => (
              <TableRow key={`${e.fieldPath}-${idx}`} sx={{ "&:last-of-type td": { borderBottom: 0 } }}>
                <TableCell sx={MONO}>{e.fieldPath}</TableCell>
                <TableCell>{e.value}</TableCell>
                <TableCell sx={MONO}>{e.verificationState}</TableCell>
                <TableCell>
                  <div>{e.sourceType}</div>
                  {e.sourceUrl ? (
                    <Typography variant="caption" noWrap sx={{ display: "block", maxWidth: 160, color: "text.secondary" }} title={e.sourceUrl}>
                      {e.sourceUrl}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{e.snippet}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
