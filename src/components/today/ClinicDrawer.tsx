"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import Instagram from "@mui/icons-material/Instagram";
import MailOutlined from "@mui/icons-material/MailOutlined";
import LanguageOutlined from "@mui/icons-material/LanguageOutlined";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import type { PlannedRouteStop } from "@/domain/routing/optimize";
import type { ProspectSearchSuccess } from "@/lib/prospecting";
import { VisitRecordForm } from "@/components/VisitRecordForm";
import { DotList, PlainList } from "@/components/feedback/DotList";
import { StatusChip } from "@/components/feedback/StatusChip";
import { clock12 } from "@/lib/format";
import { Badge } from "./Itinerary";
import { MAP_Z } from "./mapChrome";
import { ClinicIntelligenceSection } from "@/components/intelligence/ClinicIntelligenceSection";
import { ClinicWebProfileSection } from "@/components/intelligence/ClinicWebProfileSection";
import type { ClinicIntelligenceDto } from "@/domain/intelligence/clinicIntelligenceDto";
import type { ClinicWebProfileDto } from "@/domain/clinicProfile/runClinicProfile";
import { SHOW_TAXONOMY_VERIFICATION, TAXONOMY_VERIFY_FIELD_LABEL } from "@/domain/taxonomy";

const SWIPE_CLOSE_PX = 90;
/** Facts shown in the Contact block, so Signals does not repeat them. */
const CONTACT_FIELDS = new Set(["website", "generalEmail", "instagramHandle"]);
const DRAWER_WIDTH = 370;

export function ClinicDrawer({
  stop,
  displaySeq,
  timesValid = true,
  data,
  intelligence,
  isPrivileged = false,
  isResearching = false,
  onResearch,
  onRefreshResearch,
  webProfile,
  isProfiling = false,
  onProfile,
  onClose,
  onViewBrief,
}: {
  stop: PlannedRouteStop;
  /** Sequence shown to the rep (reflects any manual reorder). */
  displaySeq?: number;
  /** False when the plan was manually adjusted — optimized times are stale. */
  timesValid?: boolean;
  data: ProspectSearchSuccess;
  intelligence?: ClinicIntelligenceDto | null;
  isPrivileged?: boolean;
  isResearching?: boolean;
  onResearch?: () => void;
  onRefreshResearch?: () => void;
  /** Claude web research: public contact/identity facts for this clinic. */
  webProfile?: ClinicWebProfileDto | null;
  isProfiling?: boolean;
  onProfile?: () => void;
  onClose: () => void;
  /** Omit to hide the pre-visit brief button. */
  onViewBrief?: () => void;
}) {
  const [visitOpen, setVisitOpen] = useState(false);
  const crm = data.crmByAccountId[stop.accountId];
  const origins = data.fieldOriginsByAccountId[stop.accountId];
  const facts = data.enrichmentByAccountId[stop.accountId]?.facts;
  const places = data.contactByAccountId[stop.accountId];
  const contact = {
    phone: places?.phone ?? null,
    website: places?.website ?? data.enrichmentByAccountId[stop.accountId]?.website ?? null,
    email: facts?.generalEmail ?? null,
    instagram: facts?.instagramHandle ?? null,
  };
  // Only reasons the router actually produced; the generic opening-angle template adds nothing here.
  const routeReasons = stop.routeReasons.filter((r) => r !== "legacy nearest order").map((r) => sentence(r));
  const hasContact = Boolean(contact.phone || contact.website || contact.email || contact.instagram);

  const verified = (origins?.enrichedFields ?? [])
    .filter((f) => !CONTACT_FIELDS.has(f.split("=")[0] ?? ""))
    .slice(0, 3);
  const toVerify = (origins?.verifyFields ?? [])
    .filter((f) => SHOW_TAXONOMY_VERIFICATION || f !== TAXONOMY_VERIFY_FIELD_LABEL)
    .slice(0, 3);

  // Mobile bottom sheet: drag the handle down to dismiss.
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const el = sheetRef.current;
    if (el == null || dragStartY.current == null) return;
    const dy = Math.max(0, (e.touches[0]?.clientY ?? 0) - dragStartY.current);
    el.style.transform = `translateY(${dy}px)`;
    el.style.transition = "none";
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const el = sheetRef.current;
    if (el == null || dragStartY.current == null) return;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - dragStartY.current;
    dragStartY.current = null;
    el.style.transition = "transform 200ms ease";
    if (dy > SWIPE_CLOSE_PX) {
      el.style.transform = "translateY(105%)";
      setTimeout(onClose, 180);
    } else {
      el.style.transform = "";
    }
  };

  return (
    <Paper
      ref={sheetRef}
      className="nv-drawer-in"
      variant="outlined"
      role="dialog"
      aria-labelledby="nv-clinic-drawer-title"
      sx={{
        // Phone: bottom sheet. Tablet and up: 370px card floating bottom-left over the map.
        position: { xs: "fixed", sm: "absolute" },
        left: { xs: 0, sm: 4 },
        right: { xs: 0, sm: "auto" },
        bottom: { xs: 0, sm: 4 },
        width: { sm: DRAWER_WIDTH },
        maxHeight: { xs: "72dvh", sm: "calc(100% - 32px)" },
        zIndex: MAP_Z.drawer,
        display: "flex",
        flexDirection: "column",
        borderWidth: { xs: 0, sm: 1 },
        borderTopWidth: 1,
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
        borderBottomLeftRadius: { xs: 0, sm: 1.5 },
        borderBottomRightRadius: { xs: 0, sm: 1.5 },
        boxShadow: 3,
      }}
    >
      {/* Mobile grab handle — swipe down to close */}
      <Box
        sx={{ display: { xs: "flex", sm: "none" }, touchAction: "none", justifyContent: "center", pt: 2, pb: 1 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Box aria-hidden sx={{ height: 4, width: 36, borderRadius: 999, bgcolor: "divider" }} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3, px: 5, pt: { xs: 3, sm: 4 } }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
            <Box
              component="span"
              aria-hidden
              sx={{
                display: "flex",
                width: 24,
                height: 24,
                flexShrink: 0,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                typography: "caption",
                fontWeight: 600,
                bgcolor: stop.isRevisit ? "warning.main" : "primary.main",
                color: stop.isRevisit ? "warning.contrastText" : "primary.contrastText",
              }}
            >
              {displaySeq ?? stop.sequence}
            </Box>
            <Typography id="nv-clinic-drawer-title" variant="h3" component="h2" noWrap>
              {stop.businessName}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
            {stop.categoryLabel} · Segment {stop.segmentNumber}.{stop.categoryNumber} ·{" "}
            {stop.organizationTypeLabel}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.faint" }}>
            {stop.streetAddress}, {stop.city} {stop.postalCode}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ flexShrink: 0, mr: -1, color: "text.secondary" }}>
          <CloseOutlined fontSize="small" />
        </IconButton>
      </Box>

      <Box className="nv-scroll" sx={{ minHeight: 0, flex: 1, overflowY: "auto", px: 5, pb: 5 }}>
        <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          <Badge tone="neutral">{stop.leadProductLabel}</Badge>
          {stop.isRevisit && <Badge tone="signal">Revisit</Badge>}
        </Box>

        {routeReasons.length > 0 && (
          <Section title="Why this stop">
            <DotList gap={1} items={routeReasons} />
          </Section>
        )}

        <Section title="Arrival & opening">
          {timesValid ? (
            <p>
              Planned {clock12(stop.arrivalClock)}–{clock12(stop.departureClock)} ·{" "}
              {stop.openingHoursLabel}
            </p>
          ) : (
            <p>
              <Box component="span" sx={{ color: "warning.main" }}>
                Times recalculate on rebuild
              </Box>{" "}
              · {stop.openingHoursLabel}
            </p>
          )}
          {stop.suggestedDropInWindow && (
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
              {stop.suggestedDropInWindow}
            </Typography>
          )}
        </Section>

        {hasContact && (
          <Section title="Contact">
            <PlainList gap={1}>
              {contact.phone && (
                <ContactRow icon={<PhoneOutlined fontSize="inherit" />}>
                  <Link href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`} color="text.primary">
                    {contact.phone}
                  </Link>
                </ContactRow>
              )}
              {contact.website && (
                <ContactRow icon={<LanguageOutlined fontSize="inherit" />}>
                  <Link href={contact.website} target="_blank" rel="noreferrer" color="primary.main" sx={{ overflowWrap: "anywhere" }}>
                    {contact.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </Link>
                </ContactRow>
              )}
              {contact.email && (
                <ContactRow icon={<MailOutlined fontSize="inherit" />}>
                  <Link href={`mailto:${contact.email}`} color="text.primary" sx={{ overflowWrap: "anywhere" }}>
                    {contact.email}
                  </Link>
                </ContactRow>
              )}
              {contact.instagram && (
                <ContactRow icon={<Instagram fontSize="inherit" />}>
                  <Link
                    href={`https://instagram.com/${contact.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    color="text.primary"
                  >
                    {contact.instagram.startsWith("@") ? contact.instagram : `@${contact.instagram}`}
                  </Link>
                </ContactRow>
              )}
            </PlainList>
          </Section>
        )}

        {(verified.length > 0 || toVerify.length > 0) && (
          <Section title="Signals">
            <PlainList>
              {verified.map((f) => (
                <Box component="li" key={f} sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                  <CheckOutlined
                    role="img"
                    aria-label="Found on the clinic's website"
                    titleAccess="Found on the clinic's website"
                    sx={{ flexShrink: 0, fontSize: 16, color: "primary.main" }}
                  />
                  <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {humanizeField(f)}
                  </Box>
                </Box>
              ))}
              {toVerify.map((f) => (
                <Box component="li" key={f} sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                  <StatusChip tone="warning" dot={false} uppercase label="Verify" sx={{ flexShrink: 0 }} />
                  <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {humanizeField(f)}
                  </Box>
                </Box>
              ))}
            </PlainList>
          </Section>
        )}

        <Section title="NUVIOR relationship">
          {crm?.applied ? (
            <PlainList>
              <li>Status: {crm.internalStatus ?? "—"}</li>
              {crm.aptosCertificationLevel && (
                <li>
                  Aptos: {crm.aptosCertificationLevel}
                  {crm.aptosPathway && crm.aptosPathway !== "NONE" ? ` (${crm.aptosPathway})` : ""}
                </li>
              )}
              {crm.lastOrderStatus && <li>Ordering: {crm.lastOrderStatus.toLowerCase()}</li>}
              {crm.lastVisitDate && <li>Last visit: {crm.lastVisitDate.slice(0, 10)}</li>}
              {crm.nextRevisitDueDate && <li>Revisit due: {crm.nextRevisitDueDate.slice(0, 10)}</li>}
              {crm.crmStale && (
                <Box component="li" sx={{ color: "warning.main" }}>
                  Internal data may be stale
                </Box>
              )}
            </PlainList>
          ) : crm?.crmUnverified ? (
            <Typography variant="body2" sx={{ color: "warning.main" }}>
              Internal record unverified — CRM source unavailable.
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No internal record matched. Treat as a new prospect.
            </Typography>
          )}
        </Section>

        <ClinicIntelligenceSection
          intelligence={intelligence ?? null}
          isPrivileged={isPrivileged}
          isResearching={isResearching}
          onResearch={onResearch ?? (() => {})}
          onRefresh={onRefreshResearch}
        />

        <ClinicWebProfileSection
          dto={webProfile ?? null}
          isRunning={isProfiling}
          onRun={onProfile ?? (() => {})}
          knownEmails={contact.email ? [contact.email] : []}
        />

        <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
          {onViewBrief && (
            <Button variant="contained" size="large" onClick={onViewBrief} sx={{ flex: 1, fontWeight: 600 }}>
              View pre-visit brief
            </Button>
          )}
          {stop.googleMapsUrl && (
            <Button variant="outlined" size="large" component="a" href={stop.googleMapsUrl} target="_blank" rel="noreferrer" sx={{ flex: 1, fontWeight: 600 }}>
              Open in Google Maps
            </Button>
          )}
        </Box>

        <Button variant="contained" fullWidth onClick={() => setVisitOpen(true)} sx={{ mt: 2, minHeight: 40, fontWeight: 600 }}>
          Record Visit
        </Button>

        {/* Visit record: centred dialog on desktop, bottom sheet on phones. Closes itself after a save. */}
        <Dialog
          open={visitOpen}
          onClose={() => setVisitOpen(false)}
          fullWidth
          maxWidth="sm"
          scroll="paper"
          aria-labelledby="nv-visit-record-title"
          sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", sm: "center" } } }}
          slotProps={{ paper: { className: "nv-scroll", sx: { m: { xs: 0, sm: 4 }, width: 1, maxHeight: "94dvh", borderRadius: { xs: "16px 16px 0 0", sm: 2 } } } }}
        >
          <DialogTitle id="nv-visit-record-title" sx={{ pb: 1 }}>
            Record Visit
            <Typography variant="caption" component="div" sx={{ mt: 0.5, color: "text.secondary" }}>
              {stop.businessName}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: "12px !important" }}>
            <VisitRecordForm
              placeId={stop.accountId}
              crmExternalId={crm?.crmExternalId ?? null}
              businessName={stop.businessName}
              embedded
              onSaved={() => setVisitOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </Box>
    </Paper>
  );
}

function ContactRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box component="li" sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
      <Box component="span" aria-hidden sx={{ display: "flex", flexShrink: 0, fontSize: 16, color: "text.secondary" }}>
        {icon}
      </Box>
      <Box component="span" sx={{ minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block", mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ typography: "body2", lineHeight: 1.6, color: "text.primary", "& > p": { m: 0 } }}>{children}</Box>
    </Box>
  );
}

function sentence(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "skincareLines=Vichy, La Roche" → "Skincare lines: Vichy, La Roche" */
function humanizeField(f: string): string {
  const [path, ...rest] = f.split("=");
  const label = path
    .replace(/([A-Z])/g, " $1")
    .replace(/[._]/g, " ")
    .toLowerCase()
    .trim();
  const value = rest.join("=");
  return value ? `${sentence(label)}: ${value}` : sentence(label);
}
