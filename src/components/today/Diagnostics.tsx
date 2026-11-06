"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Disclosure } from "@/components/feedback/Disclosure";
import { PlainList } from "@/components/feedback/DotList";
import type { ProspectSearchSuccess } from "@/lib/prospecting";
import { MatchingQueuePanel } from "@/components/MatchingQueuePanel";
import { VerificationQueuePanel } from "@/components/VerificationQueuePanel";

/**
 * Collapsed run diagnostics — pipeline stats, exclusions, and the admin
 * queues (matching / verification). Kept out of the rep's primary flow.
 */
export function Diagnostics({ data }: { data: ProspectSearchSuccess }) {
  const [open, setOpen] = useState(false);
  const summary = data.routeSummary;
  const excluded = summary?.excludedForRouting ?? [];
  const verificationQueue = data.verificationQueue;
  const attention =
    data.matchingQueue.length +
    verificationQueue.length +
    excluded.length +
    data.result.excludedDoNotContact.length;

  return (
    <Box sx={{ borderTop: 1, borderColor: "divider" }}>
      <Disclosure
        variant="row"
        label="Run diagnostics"
        open={open}
        onToggle={setOpen}
        trailing={attention > 0 ? `${attention} items` : undefined}
        contentSx={{ display: "grid", gap: 4, px: 4, pb: 6 }}
      >
        <Paper component="dl" variant="outlined" sx={{ m: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 4, rowGap: 2, p: 4 }}>
          <Stat label="Discovered" value={String(data.discovery.discoveredCount)} />
          <Stat label="Qualified" value={String(data.qualifiedCount)} />
          <Stat label="Places" value={data.placesProvider} />
          <Stat label="CRM" value={data.crmProvider + (data.crmUnavailable ? " (unavailable)" : "")} />
          <Stat label="Routing" value={data.routingProvider} />
          <Stat
            label="AI briefs"
            value={
              data.llm.enabled
                ? `${data.llm.briefsSynthesized} synthesized / ${data.llm.briefsFallback} fallback`
                : "template"
            }
          />
          <Stat
            label="Road geometry"
            value={
              data.routeGeometry
                ? `${data.routeGeometry.provider} · ${data.routeGeometry.encodedSegments.length} segment(s)${data.routeGeometry.fromCache ? " · cached" : ""}`
                : "unavailable — schematic line shown"
            }
          />
          {data.workingAreaApplied && (
            <Stat
              label="Working area"
              value={`${data.workingAreaApplied.points} points · ${data.workingAreaApplied.excludedOutsideArea} candidates outside excluded`}
            />
          )}
        </Paper>

        {summary && summary.warnings.length > 0 && (
          <Block title="Routing warnings">
            <Box component="ul" sx={{ m: 0, pl: 4, display: "grid", gap: 1 }}>
              {summary.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </Box>
          </Block>
        )}

        {excluded.length > 0 && (
          <Block title={`Not routed (${excluded.length})`}>
            <PlainList>
              {excluded.map((e) => (
                <Box component="li" key={e.accountId} sx={{ display: "flex", justifyContent: "space-between", gap: 3 }}>
                  <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.businessName}
                  </Box>
                  <Box component="span" sx={{ flexShrink: 0, color: "text.faint" }}>
                    {e.reason}
                  </Box>
                </Box>
              ))}
            </PlainList>
          </Block>
        )}

        {data.result.excludedDoNotContact.length > 0 && (
          <Block title="Excluded — do not contact">
            <PlainList>
              {data.result.excludedDoNotContact.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </PlainList>
          </Block>
        )}

        {data.result.unverifiedAccounts.length > 0 && (
          <Block title="Verify manually">
            <PlainList>
              {data.result.unverifiedAccounts.map((a) => (
                <li key={a.accountId}>{a.businessName}</li>
              ))}
            </PlainList>
          </Block>
        )}

        <MatchingQueuePanel items={data.matchingQueue} />
        <VerificationQueuePanel items={verificationQueue} />
      </Disclosure>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="dt" variant="eyebrow" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography component="dd" variant="caption" sx={{ display: "block", m: 0, mt: 0.5, color: "text.primary", overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </Box>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 4, typography: "caption", color: "text.primary" }}>
      <Typography component="h4" variant="eyebrow" sx={{ display: "block", mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
