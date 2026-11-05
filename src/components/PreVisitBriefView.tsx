"use client";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import { Disclosure } from "@/components/feedback/Disclosure";
import { DotList, PlainList } from "@/components/feedback/DotList";
import type { PreVisitBriefPayload } from "@/domain/brief";
import { clock12 } from "@/lib/format";

/**
 * Two-minute field briefing card. Lead product is deterministic (locked from
 * qualification) — the layout keeps it visually dominant.
 */
export function PreVisitBriefView({
  brief,
  onClose,
  arrivalClock,
}: {
  brief: PreVisitBriefPayload;
  onClose: () => void;
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
    <Box>
      {/* Header */}
      <Box component="header" sx={{ borderBottom: 1, borderColor: "divider", px: { xs: 6, sm: 8 }, pt: 5, pb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="eyebrow" sx={{ color: "primary.main", letterSpacing: "0.18em" }}>
              Pre-visit brief
            </Typography>
            <Typography id="nv-brief-title" variant="h2" component="h2" sx={{ mt: 1 }}>
              {brief.accountName}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
              {visitTypeLabel}
              {arrivalClock ? ` · Arrive ${clock12(arrivalClock)}` : ""} · {brief.categoryLabel} ·{" "}
              {brief.provinceCode}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close brief" sx={{ flexShrink: 0, mr: -1, color: "text.secondary" }}>
            <CloseOutlined fontSize="small" />
          </IconButton>
        </Box>

        {/* Lead product hero */}
        <Box sx={{ mt: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 3, borderRadius: 1, bgcolor: "primary.tint", px: 4, py: 3 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="eyebrow" sx={{ color: "primary.main" }}>
              Lead product this visit
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 600 }}>
              {brief.leadProductForVisit}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 6, px: { xs: 6, sm: 8 }, py: 6 }}>
        {brief.clinicIntelligence && (
          <IntelligenceBriefSections intel={brief.clinicIntelligence} />
        )}

        {brief.generator === "llm_fallback" && brief.llmMeta?.fallbackReason && (
          <Note>AI synthesis unavailable — showing the deterministic template brief.</Note>
        )}

        <Section title="Why we're here">
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
            {brief.leadProductWhy}
          </Typography>
          <DotList items={brief.snapshotThreeLines} sx={{ mt: 2 }} />
        </Section>

        {brief.accountSummary && (
          <Section title="What we know">
            <p>{brief.accountSummary}</p>
            <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "text.faint" }}>
              AI-assisted summary — product and contact rules remain deterministic.
            </Typography>
          </Section>
        )}

        {brief.thinInputWarnings.length > 0 && (
          <Note>
            <Typography variant="eyebrow" component="strong" sx={{ display: "block", mb: 1, color: "inherit" }}>
              Confirm on site
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 4, display: "grid", gap: 0.5 }}>
              {brief.thinInputWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </Box>
          </Note>
        )}

        <Section title="Opening">
          <Paper variant="outlined" component="blockquote" sx={{ m: 0, px: 4, py: 3, bgcolor: "background.default", fontStyle: "italic" }}>
            &ldquo;{primaryOpening}&rdquo;
          </Paper>
          <Disclosure label="Other openings" sx={{ mt: 2 }} contentSx={{ pt: 2 }}>
            <PlainList gap={1.5}>
              <li>
                <Box component="span" sx={{ fontWeight: 500, color: "text.secondary" }}>
                  Cold:{" "}
                </Box>
                {brief.openingLines.cold}
              </li>
              <li>
                <Box component="span" sx={{ fontWeight: 500, color: "text.secondary" }}>
                  Knows NUVIOR:{" "}
                </Box>
                {brief.openingLines.knowsNuvior}
              </li>
              <li>
                <Box component="span" sx={{ fontWeight: 500, color: "text.secondary" }}>
                  Revisit:{" "}
                </Box>
                {brief.openingLines.revisit}
              </li>
            </PlainList>
          </Disclosure>
        </Section>

        <Section title="Questions to ask" hint="Order matters">
          <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gap: 2 }}>
            {brief.fiveQuestions.map((q, i) => (
              <Box component="li" key={q} sx={{ display: "flex", gap: 3 }}>
                <Box
                  component="span"
                  aria-hidden
                  sx={{ display: "flex", width: 20, height: 20, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "background.sunken", typography: "caption", fontWeight: 600, color: "text.secondary" }}
                >
                  {i + 1}
                </Box>
                <span>{q}</span>
              </Box>
            ))}
          </Box>
        </Section>

        <Section title="Signals to look for">
          <DotList items={brief.signalsToReadOnSite} />
        </Section>

        <Section title="Likely objections">
          <PlainList gap={3}>
            {brief.objectionsAndResponses.map((o) => (
              <li key={o.objection}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                  &ldquo;{o.objection}&rdquo;
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                  {o.response}
                </Typography>
              </li>
            ))}
          </PlainList>
        </Section>

        <Section title="The ask">
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
            {brief.theAsk}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary", lineHeight: 1.6 }}>
            <Box component="span" sx={{ fontWeight: 500 }}>
              Leave behind:
            </Box>{" "}
            {brief.leaveBehind}
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary", lineHeight: 1.6 }}>
            <Box component="span" sx={{ fontWeight: 500 }}>
              If the first product lands:
            </Box>{" "}
            {brief.secondProductIfFirstLands}
          </Typography>
        </Section>

        <Section title="Do not say">
          <PlainList gap={1.5}>
            {brief.doNotSay.map((d) => (
              <Box component="li" key={d} sx={{ display: "flex", gap: 2, color: "error.main" }}>
                <CloseOutlined aria-hidden sx={{ fontSize: 14, mt: "3px", flexShrink: 0 }} />
                <span>{d}</span>
              </Box>
            ))}
          </PlainList>
        </Section>

        <Typography variant="caption" sx={{ borderTop: 1, borderColor: "divider", pt: 3, color: "text.faint" }}>
          {brief.season} · {brief.provinceUvNote || "No province UV note"} · Seasonal order:{" "}
          {brief.seasonalPitchOrder.join(" → ")} · Generated {brief.generatedAt.slice(0, 16).replace("T", " ")}
          {brief.llmMeta ? ` · ${brief.llmMeta.provider}` : " · template"}
        </Typography>
      </Box>
    </Box>
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
    <Box component="section">
      <Typography variant="eyebrow" component="h3" sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 2 }}>
        {title}
        {hint && (
          <Box component="span" sx={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            — {hint}
          </Box>
        )}
      </Typography>
      <Box sx={{ typography: "body2", lineHeight: 1.6, color: "text.primary", "& > p": { m: 0 } }}>{children}</Box>
    </Box>
  );
}

/** Signal-toned wash for caveats the rep must act on (thin inputs, template fallback). */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <Box role="note" sx={{ borderRadius: 1, px: 4, py: 3, bgcolor: "warning.tint", color: "warning.main", typography: "body2", lineHeight: 1.6 }}>
      {children}
    </Box>
  );
}

function IntelligenceBriefSections({ intel }: { intel: NonNullable<PreVisitBriefPayload["clinicIntelligence"]> }) {
  if (!intel) return null;
  return (
    <Paper variant="outlined" sx={{ display: "grid", gap: 4, p: 4, borderRadius: 1.5, bgcolor: "background.sunken" }}>
      <Typography variant="eyebrow" sx={{ color: "primary.main" }}>
        Clinic intelligence
      </Typography>

      <BriefBlock title="Clinic snapshot">
        <DotList gap={1} items={intel.clinicSnapshot} />
      </BriefBlock>

      {intel.whatTheyAppearToOffer.length > 0 && (
        <BriefBlock title="What they appear to offer">
          <PlainList gap={0.5}>
            {intel.whatTheyAppearToOffer.slice(0, 10).map((o) => (
              <li key={o}>{o}</li>
            ))}
          </PlainList>
        </BriefBlock>
      )}

      {intel.bestOpportunity && (
        <BriefBlock title="Best NUVIOR opportunity">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {intel.bestOpportunity.productName}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", color: "primary.main" }}>
            {intel.bestOpportunity.headline}
          </Typography>
        </BriefBlock>
      )}

      {intel.whyReasons.length > 0 && (
        <BriefBlock title="Why">
          <DotList gap={1} items={intel.whyReasons} />
        </BriefBlock>
      )}

      {intel.gapSummary && (
        <BriefBlock title="Gap">
          <p>{intel.gapSummary}</p>
        </BriefBlock>
      )}

      {intel.verifyQuestion && (
        <BriefBlock title="Verify">
          <Typography variant="body2" sx={{ fontWeight: 500, fontStyle: "italic" }}>
            &ldquo;{intel.verifyQuestion}&rdquo;
          </Typography>
        </BriefBlock>
      )}

      {intel.openingAngle && (
        <BriefBlock title="Opening angle">
          <p>{intel.openingAngle}</p>
        </BriefBlock>
      )}

      {intel.watchOuts.length > 0 && (
        <BriefBlock title="Watch-outs">
          <Box component="ul" sx={{ m: 0, pl: 4, display: "grid", gap: 0.5 }}>
            {intel.watchOuts.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </Box>
        </BriefBlock>
      )}

      {intel.lockedFromOpportunityEngine && (
        <Typography variant="caption" sx={{ color: "text.faint" }}>
          Primary product locked from opportunity engine — AI may polish wording only.
        </Typography>
      )}
    </Paper>
  );
}

function BriefBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="eyebrow" component="h4" sx={{ display: "block" }}>
        {title}
      </Typography>
      <Box sx={{ mt: 1, typography: "body2", "& > p": { m: 0 } }}>{children}</Box>
    </Box>
  );
}
