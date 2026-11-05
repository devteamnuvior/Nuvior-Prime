"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { ClinicIntelligenceDto, EvidenceItem } from "@/domain/intelligence/clinicIntelligenceDto";
import { Badge } from "@/components/today/Itinerary";
import { Disclosure } from "@/components/feedback/Disclosure";
import { DotList, PlainList } from "@/components/feedback/DotList";

export function ClinicIntelligenceSection({
  intelligence,
  isPrivileged,
  isResearching,
  onResearch,
  onRefresh,
}: {
  intelligence: ClinicIntelligenceDto | null;
  isPrivileged: boolean;
  isResearching: boolean;
  onResearch: () => void;
  onRefresh?: () => void;
}) {
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  if (!intelligence) {
    return (
      <IntelSection title="Clinic Intelligence">
        <Muted>Research this clinic to see offerings, gaps, and the best NUVIOR opportunity.</Muted>
        <Button variant="contained" size="large" fullWidth onClick={onResearch} disabled={isResearching} sx={{ mt: 3, fontWeight: 600 }}>
          {isResearching ? "Researching…" : "Research clinic"}
        </Button>
      </IntelSection>
    );
  }

  const state = isResearching ? "RESEARCHING" : intelligence.researchState;

  if (state === "NOT_RESEARCHED") {
    return (
      <IntelSection title="Clinic Intelligence">
        <Muted>Research this clinic to see offerings, gaps, and the best NUVIOR opportunity.</Muted>
        <Button variant="contained" size="large" fullWidth onClick={onResearch} disabled={isResearching} sx={{ mt: 3, fontWeight: 600 }}>
          Research clinic
        </Button>
      </IntelSection>
    );
  }

  if (state === "RESEARCHING") {
    return (
      <IntelSection title="Clinic Intelligence">
        <Muted>Researching clinic website and profile…</Muted>
        <LinearProgress aria-label="Researching clinic" sx={{ mt: 2, height: 6, borderRadius: 999 }} />
      </IntelSection>
    );
  }

  if (state === "FAILED") {
    return (
      <IntelSection title="Clinic Intelligence">
        <Typography variant="body2" sx={{ color: "warning.main" }}>
          {intelligence.failureMessage ?? "Research failed. Try again."}
        </Typography>
        <Button variant="outlined" size="large" fullWidth onClick={onResearch} sx={{ mt: 3 }}>
          Retry research
        </Button>
      </IntelSection>
    );
  }

  return (
    <IntelSection title="Clinic Intelligence">
      {state === "STALE" && (
        <Typography variant="caption" sx={{ display: "block", mb: 3, color: "warning.main" }}>
          Source pages changed — refresh for updated intelligence.
        </Typography>
      )}

      {/* Account Fit — visually separate */}
      <Paper variant="outlined" sx={{ px: 3, py: 2.5, bgcolor: "background.sunken" }}>
        <Eyebrow>Account fit</Eyebrow>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Should we visit this clinic?
          {intelligence.accountFitScore != null && (
            <Box component="span" sx={{ ml: 2, fontWeight: 600, color: "primary.main" }}>
              Fit {intelligence.accountFitScore}
            </Box>
          )}
        </Typography>
      </Paper>

      {/* Primary opportunity */}
      <Box sx={{ mt: 3 }}>
        <Eyebrow>Best NUVIOR opportunity</Eyebrow>
        {intelligence.blockedDnc ? (
          <Muted sx={{ mt: 1.5 }}>
            {intelligence.noRecommendationMessage ??
              "Do-not-contact — no actionable sales recommendation."}
          </Muted>
        ) : intelligence.primary ? (
          <Paper variant="outlined" sx={{ mt: 2, px: 3.5, py: 3, borderColor: "primary.light", bgcolor: "primary.tint" }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {intelligence.primary.productName}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontWeight: 500, color: "primary.main" }}>
              {intelligence.primary.headline}
            </Typography>
          </Paper>
        ) : (
          <Muted sx={{ mt: 1.5 }}>{intelligence.noRecommendationMessage ?? "No clear product opportunity yet"}</Muted>
        )}
      </Box>

      {intelligence.primary?.whyReasons && intelligence.primary.whyReasons.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Eyebrow>Why this fits</Eyebrow>
          <DotList gap={1} items={intelligence.primary.whyReasons} sx={{ mt: 1.5 }} />
        </Box>
      )}

      {intelligence.primary?.verifyQuestion && (
        <Paper variant="outlined" sx={{ mt: 3, px: 3.5, py: 3, borderColor: "warning.light", bgcolor: "warning.tint" }}>
          <Typography variant="eyebrow" sx={{ display: "block", color: "warning.main" }}>
            Verify on visit
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
            &ldquo;{intelligence.primary.verifyQuestion}&rdquo;
          </Typography>
        </Paper>
      )}

      {intelligence.primary?.gap && (
        <Box sx={{ mt: 3 }}>
          <Eyebrow>Opportunity gap</Eyebrow>
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
            {intelligence.primary.gap.capabilityLabel}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
            {intelligence.primary.gap.inventoryStateLabel}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1.5 }}>
            <Box component="span" sx={{ fontWeight: 500 }}>
              Why it matters:{" "}
            </Box>
            {intelligence.primary.gap.whyItMatters}
          </Typography>
        </Box>
      )}

      {intelligence.offerings.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Eyebrow>What they appear to offer</Eyebrow>
          <PlainList sx={{ mt: 1.5 }}>
            {intelligence.offerings.slice(0, 12).map((o) => (
              <Box component="li" key={`${o.category}-${o.label}`} sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
                <span>{o.label}</span>
                <Typography component="span" variant="caption" sx={{ flexShrink: 0, color: "text.secondary" }}>
                  {o.inventoryStateLabel}
                </Typography>
              </Box>
            ))}
          </PlainList>
        </Box>
      )}

      {intelligence.secondaryOpportunities.length > 0 && (
        <Disclosure
          label={`View other opportunities (${intelligence.secondaryOpportunities.length})`}
          open={secondaryOpen}
          onToggle={setSecondaryOpen}
          sx={{ mt: 3 }}
          contentSx={{ pt: 2 }}
        >
          <PlainList gap={2} sx={{ pl: 3, borderLeft: 2, borderColor: "divider" }}>
            {intelligence.secondaryOpportunities.map((s) => (
              <li key={s.productId}>
                <Box component="span" sx={{ fontWeight: 500 }}>
                  {s.productName}
                </Box>
                <Typography component="span" variant="caption" sx={{ ml: 2, color: "text.secondary" }}>
                  {s.headline}
                </Typography>
              </li>
            ))}
          </PlainList>
        </Disclosure>
      )}

      {intelligence.evidence.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Button size="small" variant="text" color="primary" onClick={() => setEvidenceOpen((v) => !v)} aria-expanded={evidenceOpen} sx={{ px: 1, mx: -1, minHeight: 28, fontSize: "0.75rem" }}>
            {evidenceOpen ? "Hide evidence" : "View evidence"}
          </Button>
          {evidenceOpen && <EvidencePanel items={intelligence.evidence.slice(0, 20)} />}
        </Box>
      )}

      {isPrivileged && intelligence.diagnostics && (
        <DiagnosticsPanel diagnostics={intelligence.diagnostics} />
      )}

      {(state === "STALE" || state === "NEEDS_VERIFICATION" || intelligence.canRefresh) && onRefresh && (
        <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
          <Button variant="outlined" fullWidth onClick={onRefresh} disabled={isResearching}>
            Refresh research
          </Button>
        </Box>
      )}
    </IntelSection>
  );
}

/** Lightweight badge for itinerary cards. */
export function IntelligenceItineraryBadge({
  intelligence,
}: {
  intelligence: ClinicIntelligenceDto | null | undefined;
}) {
  if (!intelligence) {
    return <Badge tone="outline">Research clinic</Badge>;
  }
  if (intelligence.researchState === "NOT_RESEARCHED" || intelligence.researchState === "FAILED") {
    return <Badge tone="outline">Research clinic</Badge>;
  }
  if (intelligence.primary && !intelligence.blockedDnc) {
    return (
      <Badge tone="neutral">
        Best opportunity · {intelligence.primary.productName.split(" ").slice(0, 2).join(" ")}
      </Badge>
    );
  }
  if (intelligence.researchState === "RESEARCHING") {
    return <Badge tone="outline">Researching…</Badge>;
  }
  return null;
}

function IntelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ mt: 4, pt: 4, borderTop: 1, borderColor: "divider" }}>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ typography: "body2", lineHeight: 1.6, color: "text.primary" }}>{children}</Box>
    </Box>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="eyebrow" component="p" sx={{ display: "block" }}>
      {children}
    </Typography>
  );
}

function Muted({ children, sx }: { children: React.ReactNode; sx?: Parameters<typeof Typography>[0]["sx"] }) {
  return (
    <Typography variant="body2" sx={[{ color: "text.secondary" }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Typography>
  );
}

function EvidencePanel({ items }: { items: EvidenceItem[] }) {
  return (
    <Paper component="ul" variant="outlined" className="nv-scroll" sx={{ m: 0, mt: 2, p: 3, listStyle: "none", maxHeight: 192, overflowY: "auto", bgcolor: "background.default" }}>
      {items.map((e, i) => (
        <li key={e.id}>
          {i > 0 && <Divider sx={{ my: 2 }} />}
          {e.sourcePage && (
            <Typography variant="caption" sx={{ display: "block", fontWeight: 500, color: "text.secondary" }}>
              {e.sourcePage}
            </Typography>
          )}
          {e.url && (
            <Link href={e.url} target="_blank" rel="noreferrer" variant="caption" sx={{ display: "block", color: "primary.main", overflowWrap: "anywhere" }}>
              {e.url.length > 48 ? `${e.url.slice(0, 48)}…` : e.url}
            </Link>
          )}
          {e.extractedItem && (
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, fontWeight: 500, color: "text.primary" }}>
              {e.extractedItem}
            </Typography>
          )}
          <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.primary" }}>
            {e.snippet}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.faint" }}>
            {e.confidence} confidence · {e.retrievedAt.slice(0, 10)}
          </Typography>
        </li>
      ))}
    </Paper>
  );
}

function DiagnosticsPanel({
  diagnostics,
}: {
  diagnostics: NonNullable<ClinicIntelligenceDto["diagnostics"]>;
}) {
  const rows: [string, React.ReactNode, boolean?][] = [
    ["Score", `${diagnostics.opportunityScore} (${diagnostics.scoreBand})`, true],
    ["Confidence", diagnostics.confidence],
    ["Profile", diagnostics.profileVersion.slice(0, 12), true],
    ["Gap rules", diagnostics.gapRulesVersion],
    ["Scoring", diagnostics.scoringVersion],
    ["Catalog", diagnostics.catalogVersion.slice(0, 12), true],
    ["Provider", `${diagnostics.researchProvider}${diagnostics.researchModel ? ` / ${diagnostics.researchModel}` : ""}`],
  ];
  return (
    <Paper variant="outlined" sx={{ mt: 3, p: 3, borderStyle: "dashed", borderColor: "text.disabled", bgcolor: "background.sunken" }}>
      <Disclosure label={<Typography variant="eyebrow" component="span">Admin diagnostics</Typography>} contentSx={{ pt: 2 }}>
        <Box component="dl" sx={{ m: 0, display: "grid", gap: 1, typography: "caption", color: "text.secondary" }}>
          {rows.map(([label, value, mono]) => (
            <Box key={label} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              <dt>{label}</dt>
              <Box component="dd" sx={{ m: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...(mono ? { fontFamily: "var(--mono)", color: "text.primary" } : {}) }}>
                {value}
              </Box>
            </Box>
          ))}
        </Box>
      </Disclosure>
    </Paper>
  );
}

export function intelligenceItineraryLabel(intelligence: ClinicIntelligenceDto | null | undefined): string | null {
  if (!intelligence || intelligence.researchState === "NOT_RESEARCHED") return "Research clinic";
  if (intelligence.primary && !intelligence.blockedDnc) {
    return `Best opportunity · ${intelligence.primary.productName.split(" ")[0]}`;
  }
  return null;
}
