"use client";

import { useState } from "react";
import type { ClinicWebProfileDto } from "@/domain/clinicProfile/runClinicProfile";
import type { ClinicWebProfile } from "@/domain/clinicProfile/schema";
import { Badge } from "@/components/today/Itinerary";

/**
 * Public contact & identity facts about the clinic, researched by Claude from
 * public web sources. Every fact links to the page it was read from.
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
        <p className="text-muted">Claude is searching the web and reading the clinic&apos;s site…</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
        </div>
      </Shell>
    );
  }

  if (state === "NOT_RESEARCHED" || !profile) {
    const failure = state === "FAILED" || state === "UNAVAILABLE" ? dto?.failureMessage : null;
    return (
      <Shell title="Clinic contact research">
        {failure ? (
          <p className="text-signal">{failure}</p>
        ) : (
          <p className="text-muted">
            Look up this clinic&apos;s address, phone numbers, website, social profiles and leadership
            from public sources.
          </p>
        )}
        <button
          type="button"
          onClick={onRun}
          disabled={state === "UNAVAILABLE"}
          className="mt-3 flex h-10 w-full items-center justify-center rounded-lg bg-accent text-[13px] font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {failure ? "Retry with Claude" : "Find clinic info with Claude"}
        </button>
      </Shell>
    );
  }

  return (
    <Shell title="Clinic contact research">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={profile.matchConfidence === "HIGH" ? "accent" : profile.matchConfidence === "MEDIUM" ? "neutral" : "signal"}>
          Match {profile.matchConfidence.toLowerCase()}
        </Badge>
        {dto?.provider === "mock" && <Badge tone="outline">Mock data</Badge>}
        {state === "STALE" && <Badge tone="outline">May be outdated</Badge>}
      </div>
      {profile.matchReason && <p className="mt-1.5 text-xs text-muted">{profile.matchReason}</p>}

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
          <ul className="space-y-0.5">
            {profile.phones.map((p) => (
              <li key={`${p.number}-${p.label ?? ""}`}>
                <a href={`tel:${p.number.replace(/[^+\d]/g, "")}`} className="text-ink underline-offset-2 hover:underline">
                  {p.number}
                </a>
                {p.label && <span className="text-muted"> · {p.label}</span>}
                <SourceLink url={p.sourceUrl} />
              </li>
            ))}
          </ul>
        </Row>
      )}

      {profile.emails.length > 0 && (
        <Row label="Email">
          <ul className="space-y-0.5">
            {profile.emails.map((e) => (
              <li key={e.address}>
                <a href={`mailto:${e.address}`} className="text-ink underline-offset-2 hover:underline">
                  {e.address}
                </a>
                {e.label && <span className="text-muted"> · {e.label}</span>}
                <SourceLink url={e.sourceUrl} />
              </li>
            ))}
          </ul>
        </Row>
      )}

      {profile.website && (
        <Row label="Website">
          <ExternalLink url={profile.website.url} />
        </Row>
      )}

      {profile.socialProfiles.length > 0 && (
        <Row label="Social">
          <ul className="space-y-0.5">
            {profile.socialProfiles.map((s) => (
              <li key={s.url}>
                <span className="capitalize text-muted">{s.platform}</span>{" "}
                <ExternalLink url={s.url} label={s.handle ?? undefined} />
              </li>
            ))}
          </ul>
        </Row>
      )}

      {profile.people.length > 0 && (
        <Row label="People">
          <ul className="space-y-0.5">
            {profile.people.map((p) => (
              <li key={`${p.name}-${p.role}`}>
                <span className="font-medium text-ink">{p.name}</span>
                <span className="text-muted"> · {p.role}</span>
                <SourceLink url={p.sourceUrl} />
              </li>
            ))}
          </ul>
        </Row>
      )}

      {profile.openingHours.length > 0 && (
        <Row label="Hours">
          <ul className="space-y-0.5">
            {profile.openingHours.map((h) => (
              <li key={`${h.label}-${h.hours}`}>
                <span className="text-muted">{h.label}</span> {h.hours}
                <SourceLink url={h.sourceUrl} />
              </li>
            ))}
          </ul>
        </Row>
      )}

      {profile.services.length > 0 && (
        <Row label="Services on site">
          <p>{profile.services.join(" · ")}</p>
        </Row>
      )}

      {profile.websiteSummary && (
        <Row label="Website summary">
          <p>{profile.websiteSummary}</p>
        </Row>
      )}

      {profile.unknowns.length > 0 && (
        <Row label="Not found">
          <p className="text-muted">{profile.unknowns.join(", ")}</p>
        </Row>
      )}

      {profile.notes.length > 0 && (
        <Row label="Notes">
          <ul className="space-y-0.5 text-muted">
            {profile.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Row>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSourcesOpen((v) => !v)}
          className="text-xs font-medium text-muted hover:text-ink"
        >
          {sourcesOpen ? "Hide sources" : `Sources (${profile.sources.length})`}
        </button>
        <button type="button" onClick={onRun} className="text-xs font-medium text-accent hover:underline">
          Refresh
        </button>
      </div>
      {sourcesOpen && (
        <ul className="mt-1.5 space-y-0.5 text-xs">
          {profile.sources.map((s) => (
            <li key={s.url} className="truncate">
              <ExternalLink url={s.url} label={s.title ?? undefined} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-faint">
        {dto?.provider === "claude" ? `Claude${dto.model ? ` · ${dto.model}` : ""}` : dto?.provider}
        {dto?.researchedAt ? ` · ${new Date(dto.researchedAt).toLocaleDateString()}` : ""} · Verify before relying on it.
      </p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1.5 text-[0.66rem] font-semibold tracking-[0.16em] text-faint uppercase">{title}</h3>
      <div className="text-[13px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div>{children}</div>
    </div>
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
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={url}
      className="ml-1 align-baseline text-[10px] text-faint hover:text-accent"
      aria-label={`Source: ${hostOf(url)}`}
    >
      [{hostOf(url)}]
    </a>
  );
}

function ExternalLink({ url, label }: { url: string; label?: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
      {label ?? url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
    </a>
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
