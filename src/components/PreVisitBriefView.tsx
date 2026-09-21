"use client";

import type { PreVisitBriefPayload } from "@/domain/brief";
import { clock12 } from "@/lib/format";

/**
 * Two-minute field briefing card. Lead product is deterministic (locked from
 * qualification) — the layout keeps it visually dominant.
 */
export function PreVisitBriefView({
  brief,
  onClose,
  fitScore,
  arrivalClock,
}: {
  brief: PreVisitBriefPayload;
  onClose: () => void;
  fitScore?: number;
  arrivalClock?: string | null;
}) {
  const visitTypeLabel =
    brief.visitType === "re-visit"
      ? "Revisit"
      : brief.visitType === "follow-up on a quote"
        ? "Quote follow-up"
        : "First visit";

  const primaryOpening =
    brief.visitType === "re-visit" ? brief.openingLines.revisit : brief.openingLines.cold;

  return (
    <div>
      {/* Header */}
      <header className="border-b border-rule px-6 pt-5 pb-4 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.66rem] font-semibold tracking-[0.18em] text-accent uppercase">
              Pre-visit brief
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">
              {brief.accountName}
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              {visitTypeLabel}
              {arrivalClock ? ` · Arrive ${clock12(arrivalClock)}` : ""} · {brief.categoryLabel} ·{" "}
              {brief.provinceCode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close brief"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Lead product hero */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-accent-tint px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-accent uppercase">
              Lead product this visit
            </p>
            <p className="mt-0.5 text-[15px] font-semibold text-ink">{brief.leadProductForVisit}</p>
          </div>
          {fitScore != null && (
            <span className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-white">
              Fit {fitScore}
            </span>
          )}
        </div>
      </header>

      <div className="space-y-6 px-6 py-6 md:px-8">
        {brief.clinicIntelligence && (
          <IntelligenceBriefSections intel={brief.clinicIntelligence} fitScore={fitScore} />
        )}

        {brief.generator === "llm_fallback" && brief.llmMeta?.fallbackReason && (
          <Note tone="signal">AI synthesis unavailable — showing the deterministic template brief.</Note>
        )}

        <Section title="Why we're here">
          <p className="font-medium text-ink">{brief.leadProductWhy}</p>
          <ul className="mt-2 space-y-1.5">
            {brief.snapshotThreeLines.map((l) => (
              <li key={l} className="flex gap-2">
                <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </Section>

        {brief.accountSummary && (
          <Section title="What we know">
            <p>{brief.accountSummary}</p>
            <p className="mt-1.5 text-[0.7rem] text-faint">
              AI-assisted summary — product, fit and contact rules remain deterministic.
            </p>
          </Section>
        )}

        {brief.thinInputWarnings.length > 0 && (
          <Note tone="signal">
            <strong className="mb-1 block text-[0.66rem] tracking-[0.14em] uppercase">
              Confirm on site
            </strong>
            <ul className="list-disc space-y-0.5 pl-4">
              {brief.thinInputWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Note>
        )}

        <Section title="Opening">
          <p className="rounded-lg border border-rule bg-paper px-4 py-3 text-ink italic">
            &ldquo;{primaryOpening}&rdquo;
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">
              Other openings
            </summary>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              <li>
                <span className="font-medium text-muted">Cold: </span>
                {brief.openingLines.cold}
              </li>
              <li>
                <span className="font-medium text-muted">Knows NUVIOR: </span>
                {brief.openingLines.knowsNuvior}
              </li>
              <li>
                <span className="font-medium text-muted">Revisit: </span>
                {brief.openingLines.revisit}
              </li>
            </ul>
          </details>
        </Section>

        <Section title="Questions to ask" hint="Order matters">
          <ol className="space-y-2">
            {brief.fiveQuestions.map((q, i) => (
              <li key={q} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canvas text-[11px] font-semibold text-muted">
                  {i + 1}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Signals to look for">
          <ul className="space-y-1.5">
            {brief.signalsToReadOnSite.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Likely objections">
          <ul className="space-y-3">
            {brief.objectionsAndResponses.map((o) => (
              <li key={o.objection}>
                <p className="text-muted italic">&ldquo;{o.objection}&rdquo;</p>
                <p className="mt-0.5">{o.response}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="The ask">
          <p className="font-medium text-ink">{brief.theAsk}</p>
          <p className="mt-2 text-muted">
            <span className="font-medium">Leave behind:</span> {brief.leaveBehind}
          </p>
          <p className="mt-2 text-muted">
            <span className="font-medium">If the first product lands:</span>{" "}
            {brief.secondProductIfFirstLands}
          </p>
        </Section>

        <Section title="Do not say">
          <ul className="space-y-1.5">
            {brief.doNotSay.map((d) => (
              <li key={d} className="flex gap-2 text-danger">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="mt-0.5 shrink-0">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </Section>

        <p className="border-t border-rule-soft pt-3 text-[0.68rem] text-faint">
          {brief.season} · {brief.provinceUvNote || "No province UV note"} · Seasonal order:{" "}
          {brief.seasonalPitchOrder.join(" → ")} · Generated {brief.generatedAt.slice(0, 16).replace("T", " ")}
          {brief.llmMeta ? ` · ${brief.llmMeta.provider}` : " · template"}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-baseline gap-2 text-[0.68rem] font-semibold tracking-[0.16em] text-faint uppercase">
        {title}
        {hint && <span className="font-normal normal-case tracking-normal">— {hint}</span>}
      </h3>
      <div className="text-[13.5px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function Note({ tone, children }: { tone: "signal"; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-lg px-4 py-3 text-[13px] leading-relaxed ${
        tone === "signal" ? "bg-signal-tint text-signal" : ""
      }`}
    >
      {children}
    </div>
  );
}

function IntelligenceBriefSections({
  intel,
  fitScore,
}: {
  intel: NonNullable<import("@/domain/brief").PreVisitBriefPayload["clinicIntelligence"]>;
  fitScore?: number;
}) {
  if (!intel) return null;
  return (
    <div className="space-y-4 rounded-xl border border-rule bg-canvas/40 p-4">
      <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-accent uppercase">
        Clinic intelligence
      </p>

      <BriefBlock title="Clinic snapshot">
        <ul className="space-y-1">
          {intel.clinicSnapshot.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </BriefBlock>

      <BriefBlock title="Account fit">
        <p>
          Should we visit this clinic?
          {(intel.accountFitLine || fitScore != null) && (
            <span className="ml-1 font-semibold">
              {intel.accountFitLine ?? `Fit ${fitScore}/5`}
            </span>
          )}
        </p>
      </BriefBlock>

      {intel.whatTheyAppearToOffer.length > 0 && (
        <BriefBlock title="What they appear to offer">
          <ul className="space-y-0.5">
            {intel.whatTheyAppearToOffer.slice(0, 10).map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </BriefBlock>
      )}

      {intel.bestOpportunity && (
        <BriefBlock title="Best NUVIOR opportunity">
          <p className="font-semibold text-ink">{intel.bestOpportunity.productName}</p>
          <p className="text-xs text-accent">{intel.bestOpportunity.headline}</p>
        </BriefBlock>
      )}

      {intel.whyReasons.length > 0 && (
        <BriefBlock title="Why">
          <ul className="space-y-1">
            {intel.whyReasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </BriefBlock>
      )}

      {intel.gapSummary && (
        <BriefBlock title="Gap">
          <p>{intel.gapSummary}</p>
        </BriefBlock>
      )}

      {intel.verifyQuestion && (
        <BriefBlock title="Verify">
          <p className="font-medium italic">&ldquo;{intel.verifyQuestion}&rdquo;</p>
        </BriefBlock>
      )}

      {intel.openingAngle && (
        <BriefBlock title="Opening angle">
          <p>{intel.openingAngle}</p>
        </BriefBlock>
      )}

      {intel.watchOuts.length > 0 && (
        <BriefBlock title="Watch-outs">
          <ul className="list-disc space-y-0.5 pl-4">
            {intel.watchOuts.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </BriefBlock>
      )}

      {intel.lockedFromOpportunityEngine && (
        <p className="text-[0.65rem] text-faint">
          Primary product locked from opportunity engine — AI may polish wording only.
        </p>
      )}
    </div>
  );
}

function BriefBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[0.62rem] font-semibold tracking-[0.14em] text-faint uppercase">{title}</h4>
      <div className="mt-1 text-[13px]">{children}</div>
    </div>
  );
}
