"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Facebook from "@mui/icons-material/Facebook";
import Instagram from "@mui/icons-material/Instagram";
import LinkedIn from "@mui/icons-material/LinkedIn";
import MusicNote from "@mui/icons-material/MusicNote";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import PublicOutlined from "@mui/icons-material/PublicOutlined";
import X from "@mui/icons-material/X";
import YouTube from "@mui/icons-material/YouTube";
import type { ClinicWebProfileDto } from "@/domain/clinicProfile/runClinicProfile";
import type { ClinicProduct, ClinicWebProfile } from "@/domain/clinicProfile/schema";
import { Badge } from "@/components/today/Itinerary";
import { PlainList } from "@/components/feedback/DotList";

/** One icon per platform; MUI has no TikTok glyph, so a note stands in. */
const SOCIAL_ICON: Record<ClinicWebProfile["socialProfiles"][number]["platform"], React.ReactNode> = {
  instagram: <Instagram fontSize="inherit" />,
  facebook: <Facebook fontSize="inherit" />,
  tiktok: <MusicNote fontSize="inherit" />,
  linkedin: <LinkedIn fontSize="inherit" />,
  youtube: <YouTube fontSize="inherit" />,
  x: <X fontSize="inherit" />,
  other: <PublicOutlined fontSize="inherit" />,
};

const PRODUCT_KIND_LABEL: Record<ClinicProduct["kind"], string> = {
  injectable: "Injectable",
  device: "Device",
  skincare: "Skincare",
  treatment: "Treatment",
  other: "Other",
};

/**
 * What Claude finds on the public web that Google Places does not list:
 * emails, social profiles, leadership, services and the products and devices
 * the clinic publishes. Address, phone, website and hours are shown from
 * Google Places elsewhere in the drawer. Every fact links to its source page.
 */
export function ClinicWebProfileSection({
  dto,
  isRunning,
  onRun,
  knownEmails = [],
}: {
  dto: ClinicWebProfileDto | null;
  isRunning: boolean;
  onRun: () => void;
  /** Emails the drawer already shows in Contact; the same address is not repeated here. */
  knownEmails?: string[];
}) {
  const state = dto?.state ?? "NOT_RESEARCHED";
  const profile = dto?.profile ?? null;
  const known = new Set(knownEmails.map((e) => e.trim().toLowerCase()));
  const emails = (profile?.emails ?? []).filter((e) => !known.has(e.address.trim().toLowerCase()));
  // While Claude works the button itself carries the loader; nothing else changes.
  const spinner = <CircularProgress size={16} color="inherit" aria-hidden />;

  if (state === "NOT_RESEARCHED" || !profile) {
    const failure = state === "FAILED" || state === "UNAVAILABLE" ? dto?.failureMessage : null;
    return (
      <Shell title="Clinic web research">
        {failure && (
          <Typography variant="body2" sx={{ color: "warning.main" }}>
            {failure}
          </Typography>
        )}
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={onRun}
          disabled={state === "UNAVAILABLE" || isRunning}
          startIcon={isRunning ? spinner : undefined}
          aria-busy={isRunning}
          sx={{ mt: failure ? 3 : 0, fontWeight: 600 }}
        >
          {isRunning ? "Researching…" : failure ? "Retry with Claude" : "Find clinic info with Claude"}
        </Button>
      </Shell>
    );
  }

  return (
    <Shell title="Clinic web research">
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

      {emails.length > 0 && (
        <Row label="Email">
          <PlainList gap={0.5}>
            {emails.map((e) => (
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

      {profile.socialProfiles.length > 0 && (
        <Row label="Social">
          <PlainList gap={1}>
            {profile.socialProfiles.map((s) => (
              <Box component="li" key={s.url} sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                <Box
                  component="span"
                  role="img"
                  aria-label={s.platform}
                  title={s.platform}
                  sx={{ display: "flex", flexShrink: 0, fontSize: 16, color: "text.secondary" }}
                >
                  {SOCIAL_ICON[s.platform]}
                </Box>
                <ExternalLink url={s.url} label={s.handle ?? undefined} quiet />
              </Box>
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

      {profile.services.length > 0 && (
        <Row label="Services">
          <PlainList gap={0.5}>
            {profile.services.map((svc) => (
              <li key={svc}>{svc}</li>
            ))}
          </PlainList>
        </Row>
      )}

      {profile.products.length > 0 && (
        <Row label="Products & Devices">
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
        <Row label="Website Summary">
          <p>{profile.websiteSummary}</p>
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

      {profile.sources.length > 0 && (
        <Row label="Sources">
          <PlainList gap={0.5}>
            {profile.sources.map((s) => (
              <Box component="li" key={s.url} sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <ExternalLink url={s.url} label={s.title ?? undefined} />
              </Box>
            ))}
          </PlainList>
        </Row>
      )}

      {profile.unknowns.length > 0 && (
        <Row label="Not Found">
          <Muted>{profile.unknowns.join(", ")}</Muted>
        </Row>
      )}

      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button size="small" variant="text" color="primary" onClick={onRun} disabled={isRunning} startIcon={isRunning ? spinner : undefined} aria-busy={isRunning} sx={{ px: 1, mx: -1, minHeight: 28, fontSize: "0.75rem" }}>
          {isRunning ? "Refreshing…" : "Refresh"}
        </Button>
      </Box>
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

/** Section title: bold, with a short green rule underneath so it stands apart from the content. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="body2"
        component="div"
        sx={{
          display: "inline-block",
          fontWeight: 600,
          color: "text.primary",
          pb: 0.5,
          mb: 1.5,
          borderBottom: 2,
          borderColor: "primary.main",
        }}
      >
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

function SourceLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <Link
      href={url}
      target="_blank"
      rel="noreferrer"
      title={url}
      aria-label={`Source: ${hostOf(url)}`}
      sx={{ ml: 1, display: "inline-flex", verticalAlign: "middle", fontSize: 14, color: "text.faint", "&:hover": { color: "primary.main" } }}
    >
      <OpenInNewOutlined fontSize="inherit" />
    </Link>
  );
}

/** `quiet`: reads as body text and only turns green on hover (social handles). */
function ExternalLink({ url, label, quiet = false }: { url: string; label?: string; quiet?: boolean }) {
  return (
    <Link
      href={url}
      target="_blank"
      rel="noreferrer"
      color={quiet ? "text.primary" : "primary.main"}
      sx={{ overflowWrap: "anywhere", ...(quiet ? { "&:hover, &:focus-visible": { color: "primary.main" } } : {}) }}
    >
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
