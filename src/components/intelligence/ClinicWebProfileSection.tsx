"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import type { ClinicWebProfileDto } from "@/domain/clinicProfile/runClinicProfile";
import type { ClinicProduct, ClinicWebProfile } from "@/domain/clinicProfile/schema";
import { Badge } from "@/components/today/Itinerary";
import { PlainList } from "@/components/feedback/DotList";

const PRODUCT_KIND_LABEL: Record<ClinicProduct["kind"], string> = {
  injectable: "Injectable",
  device: "Device",
  skincare: "Skincare",
  treatment: "Treatment",
  other: "Other",
};

/**
 * Public contact & identity facts about the clinic, plus the products and
 * devices it publishes, researched by Claude from public web sources. Every
 * fact links to the page it was read from.
 */
export function ClinicWebProfileSection({
  dto,
  isRunning,
  onRun,
}: {
  dto: ClinicWebProfileDto | null;
  isRunning: boolean;
  onRun: () => void;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const state = isRunning ? "RUNNING" : (dto?.state ?? "NOT_RESEARCHED");
  const profile = dto?.profile ?? null;

  if (state === "RUNNING") {
    return (
      <Shell title="Clinic contact research">
        <Muted>Claude is searching the web and reading the clinic&apos;s site…</Muted>
        <LinearProgress aria-label="Researching clinic contact details" sx={{ mt: 2, height: 6, borderRadius: 999 }} />
      </Shell>
    );
  }

  if (state === "NOT_RESEARCHED" || !profile) {
    const failure = state === "FAILED" || state === "UNAVAILABLE" ? dto?.failureMessage : null;
    return (
      <Shell title="Clinic contact research">
        {failure ? (
          <Typography variant="body2" sx={{ color: "warning.main" }}>
            {failure}
          </Typography>
        ) : (
          <Muted>
            Look up this clinic&apos;s address, phone numbers, website, social profiles, leadership and the
            products and devices it publishes, from public sources.
          </Muted>
        )}
        <Button variant="contained" size="large" fullWidth onClick={onRun} disabled={state === "UNAVAILABLE"} sx={{ mt: 3, fontWeight: 600 }}>
          {failure ? "Retry with Claude" : "Find clinic info with Claude"}
        </Button>
      </Shell>
    );
  }

  return (
    <Shell title="Clinic contact research">
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
        <Badge tone={profile.matchConfidence === "HIGH" ? "accent" : profile.matchConfidence === "MEDIUM" ? "neutral" : "signal"}>
          Match {profile.matchConfidence.toLowerCase()}
        </Badge>
        {dto?.provider === "mock" && <Badge tone="outline">Mock data</Badge>}
        {state === "STALE" && <Badge tone="outline">May be outdated</Badge>}
      </Box>
      {profile.matchReason && (
        <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "text.secondary" }}>
          {profile.matchReason}
        </Typography>
      )}

      {profile.address && (profile.address.formatted || profile.address.street) && (
        <Row label="Address">
          <Sourced url={profile.address.sourceUrl}>
            {profile.address.formatted ??
              [profile.address.street, profile.address.city, profile.address.province, profile.address.postalCode]
                .filter(Boolean)
                .join(", ")}
          </Sourced>
        </Row>
      )}

      {profile.phones.length > 0 && (
        <Row label="Phone">
          <PlainList gap={0.5}>
            {profile.phones.map((p) => (
              <li key={`${p.number}-${p.label ?? ""}`}>
                <Link href={`tel:${p.number.replace(/[^+\d]/g, "")}`} color="text.primary">
                  {p.number}
                </Link>
                {p.label && <MutedSpan> · {p.label}</MutedSpan>}
                <SourceLink url={p.sourceUrl} />
              </li>
            ))}
          </PlainList>
        </Row>
      )}

      {profile.emails.length > 0 && (
        <Row label="Email">
          <PlainList gap={0.5}>
            {profile.emails.map((e) => (
              <li key={e.address}>
                <Link href={`mailto:${e.address}`} color="text.primary">
                  {e.address}
                </Link>
                {e.label && <MutedSpan> · {e.label}</MutedSpan>}
                <SourceLink url={e.sourceUrl} />
              </li>
            ))}
          </PlainList>
        </Row>
      )}

      {profile.website && (
        <Row label="Website">
          <ExternalLink url={profile.website.url} />
        </Row>
      )}

      {profile.socialProfiles.length > 0 && (
        <Row label="Social">
          <PlainList gap={0.5}>
            {profile.socialProfiles.map((s) => (
              <li key={s.url}>
                <MutedSpan sx={{ textTransform: "capitalize" }}>{s.platform}</MutedSpan>{" "}
                <ExternalLink url={s.url} label={s.handle ?? undefined} />
              </li>
            ))}
          </PlainList>
        </Row>
      )}

      {profile.people.length > 0 && (
        <Row label="People">
          <PlainList gap={0.5}>
            {profile.people.map((p) => (
              <li key={`${p.name}-${p.role}`}>
                <Box component="span" sx={{ fontWeight: 500 }}>
                  {p.name}
                </Box>
                <MutedSpan> · {p.role}</MutedSpan>
                <SourceLink url={p.sourceUrl} />
              </li>
            ))}
          </PlainList>
        </Row>
      )}

      {profile.openingHours.length > 0 && (
        <Row label="Hours">
          <PlainList gap={0.5}>
            {profile.openingHours.map((h) => (
              <li key={`${h.label}-${h.hours}`}>
                <MutedSpan>{h.label}</MutedSpan> {h.hours}
                <SourceLink url={h.sourceUrl} />
              </li>
            ))}
          </PlainList>
        </Row>
      )}

      {profile.services.length > 0 && (
        <Row label="Services on site">
          <p>{profile.services.join(" · ")}</p>
        </Row>
      )}

      {profile.products.length > 0 && (
        <Row label="Products & devices they publish">
          <PlainList gap={0.5}>
            {profile.products.map((p) => (
              <li key={`${p.kind}-${p.name}`}>
                <Box component="span" sx={{ fontWeight: 500 }}>
                  {p.name}
                </Box>
                <MutedSpan> · {PRODUCT_KIND_LABEL[p.kind]}</MutedSpan>
                {p.context && <MutedSpan> · {p.context}</MutedSpan>}
                <SourceLink url={p.sourceUrl} />
              </li>
            ))}
          </PlainList>
        </Row>
      )}

      {profile.websiteSummary && (
        <Row label="Website summary">
          <p>{profile.websiteSummary}</p>
        </Row>
      )}

      {profile.unknowns.length > 0 && (
        <Row label="Not found">
          <Muted>{profile.unknowns.join(", ")}</Muted>
        </Row>
      )}

      {profile.notes.length > 0 && (
        <Row label="Notes">
          <PlainList gap={0.5} sx={{ color: "text.secondary" }}>
            {profile.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </PlainList>
        </Row>
      )}

      <Box sx={{ mt: 3, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <Button size="small" variant="text" onClick={() => setSourcesOpen((v) => !v)} aria-expanded={sourcesOpen} sx={{ px: 1, mx: -1, minHeight: 28, fontSize: "0.75rem", color: "text.secondary", "&:hover": { color: "text.primary" } }}>
          {sourcesOpen ? "Hide sources" : `Sources (${profile.sources.length})`}
        </Button>
        <Button size="small" variant="text" color="primary" onClick={onRun} sx={{ px: 1, mx: -1, minHeight: 28, fontSize: "0.75rem" }}>
          Refresh
        </Button>
      </Box>
      {sourcesOpen && (
        <PlainList gap={0.5} sx={{ mt: 1.5, typography: "caption" }}>
          {profile.sources.map((s) => (
            <Box component="li" key={s.url} sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <ExternalLink url={s.url} label={s.title ?? undefined} />
            </Box>
          ))}
        </PlainList>
      )}
      <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.faint" }}>
        {dto?.provider === "claude" ? `Claude${dto.model ? ` · ${dto.model}` : ""}` : dto?.provider}
        {dto?.researchedAt ? ` · ${new Date(dto.researchedAt).toLocaleDateString()}` : ""} · Verify before relying on it.
      </Typography>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ typography: "body2", lineHeight: 1.6, color: "text.primary", "& p": { m: 0 } }}>{children}</Box>
    </Box>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" component="div" sx={{ fontWeight: 500, color: "text.secondary" }}>
        {label}
      </Typography>
      <div>{children}</div>
    </Box>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      {children}
    </Typography>
  );
}

function MutedSpan({ children, sx }: { children: React.ReactNode; sx?: Parameters<typeof Box>[0]["sx"] }) {
  return (
    <Box component="span" sx={[{ color: "text.secondary" }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  );
}

function Sourced({ url, children }: { url: string | null; children: React.ReactNode }) {
  return (
    <span>
      {children}
      <SourceLink url={url} />
    </span>
  );
}

function SourceLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <Link
      href={url}
      target="_blank"
      rel="noreferrer"
      title={url}
      aria-label={`Source: ${hostOf(url)}`}
      variant="caption"
      underline="hover"
      sx={{ ml: 1, verticalAlign: "baseline", fontSize: "0.625rem", color: "text.faint", "&:hover": { color: "primary.main" } }}
    >
      [{hostOf(url)}]
    </Link>
  );
}

function ExternalLink({ url, label }: { url: string; label?: string }) {
  return (
    <Link href={url} target="_blank" rel="noreferrer" color="primary.main" sx={{ overflowWrap: "anywhere" }}>
      {label ?? url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
    </Link>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

export type { ClinicWebProfile };
