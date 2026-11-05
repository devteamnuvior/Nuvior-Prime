"use client";

import { useEffect, useRef } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MuiIconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import KeyboardArrowDownOutlined from "@mui/icons-material/KeyboardArrowDownOutlined";
import KeyboardArrowUpOutlined from "@mui/icons-material/KeyboardArrowUpOutlined";
import { clock12, duration, km } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";
import type { DisplayStop } from "./manualPlan";
import { IntelligenceItineraryBadge } from "@/components/intelligence/ClinicIntelligenceSection";
import type { ClinicIntelligenceDto } from "@/domain/intelligence/clinicIntelligenceDto";
import type { VisitedNearbyEntry } from "@/domain/visitList";

const NODE = 28;

export function Itinerary({
  stops,
  dayStartClock,
  startLabel,
  selectedId,
  onSelect,
  onViewBrief,
  hoveredId,
  onHover,
  adjusted,
  removedCount,
  onMove,
  onRemove,
  onResetPlan,
  intelligenceByAccountId,
  visitedNearby = [],
}: {
  stops: DisplayStop[];
  dayStartClock: string;
  startLabel: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Omit to hide the brief button. */
  onViewBrief?: (id: string) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  /** True when the rep reordered/removed stops — optimized times no longer apply. */
  adjusted: boolean;
  removedCount: number;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onResetPlan: () => void;
  intelligenceByAccountId?: Record<string, ClinicIntelligenceDto>;
  /** Nearby clinics left off today because you or a teammate visited them recently. */
  visitedNearby?: VisitedNearbyEntry[];
}) {
  // Map/list choreography: selecting a marker scrolls its card into view.
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  useEffect(() => {
    if (!selectedId) return;
    cardRefs.current
      .get(selectedId)
      ?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selectedId]);

  return (
    <>
      {adjusted && (
        <Alert
          severity="warning"
          icon={false}
          className="nv-fade-in"
          sx={{ mx: 4, mt: 3 }}
          action={
            <Button size="small" color="inherit" onClick={onResetPlan} sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
              Restore optimized
            </Button>
          }
        >
          Manually adjusted plan{removedCount > 0 ? ` · ${removedCount} removed` : ""}. Arrival
          times and drive legs will recalculate when you rebuild the route.
        </Alert>
      )}

      <Box component="ol" sx={{ m: 0, px: 4, py: 3, listStyle: "none" }}>
        {/* Start */}
        <Box component="li" sx={{ display: "flex", gap: 3 }}>
          <Rail>
            <Node sx={{ mt: 1, bgcolor: "background.inverse", color: "background.default", letterSpacing: "0.08em", fontSize: "0.625rem" }}>S</Node>
            <RailLine />
          </Rail>
          <Box sx={{ pt: 1.5, pb: 4, minWidth: 0 }}>
            <Typography variant="eyebrow" sx={{ display: "block" }}>
              Start · {clock12(dayStartClock)}
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 500 }}>
              {startLabel}
            </Typography>
          </Box>
        </Box>

        {stops.map((s, i) => {
          const selected = s.accountId === selectedId;
          const hovered = s.accountId === hoveredId;
          const warn = s.openingHoursState !== "open" && s.openingHoursState !== "unknown";
          // In an adjusted plan the optimized leg only holds for legs whose
          // predecessor is unchanged; we keep it simple and honest: hide all.
          const legValid = !adjusted;
          return (
            <Box component="li" key={s.accountId} sx={{ display: "flex", gap: 3 }}>
              <Rail>
                <RailLine />
                <Node
                  sx={{
                    my: 1,
                    bgcolor: selected ? "background.inverse" : s.isRevisit ? "warning.main" : "primary.main",
                    color: selected ? "background.default" : s.isRevisit ? "warning.contrastText" : "primary.contrastText",
                    transition: (t) => t.transitions.create("background-color", { duration: t.transitions.duration.shortest }),
                  }}
                >
                  {String(s.displaySeq).padStart(2, "0")}
                </Node>
                {i < stops.length - 1 ? <RailLine /> : <Box sx={{ flex: 1 }} />}
              </Rail>

              <Box sx={{ minWidth: 0, flex: 1, pb: 1.5 }}>
                {/* Travel leg from previous */}
                <Typography variant="caption" component="div" sx={{ py: 1.5, color: "text.faint" }}>
                  {legValid ? (
                    s.travelMinutesFromPrevious != null ? (
                      <>
                        {duration(s.travelMinutesFromPrevious)} · {km(s.travelDistanceKmFromPrevious)}
                        {s.durationIsGeodesicEstimate && (
                          <Box
                            component="span"
                            title="Straight-line estimate — not verified drive time"
                            sx={{ ml: 1.5, color: "warning.main" }}
                          >
                            est.
                          </Box>
                        )}
                      </>
                    ) : (
                      "Travel time unavailable"
                    )
                  ) : (
                    <Box component="span" sx={{ color: "warning.main" }}>
                      Leg recalculates on rebuild
                    </Box>
                  )}
                </Typography>

                <Paper
                  ref={(el: HTMLDivElement | null) => {
                    if (el) cardRefs.current.set(s.accountId, el);
                    else cardRefs.current.delete(s.accountId);
                  }}
                  variant="outlined"
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  onClick={() => onSelect(selected ? null : s.accountId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(selected ? null : s.accountId);
                    }
                  }}
                  onMouseEnter={() => onHover(s.accountId)}
                  onMouseLeave={() => onHover(null)}
                  className="nv-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  sx={{
                    width: 1,
                    cursor: "pointer",
                    px: 3.5,
                    py: 3,
                    textAlign: "left",
                    // Selection shows as the tinted background only; no accent border around the card.
                    borderColor: hovered && !selected ? "text.disabled" : "divider",
                    bgcolor: selected ? "action.selected" : hovered ? "background.sunken" : "background.paper",
                    boxShadow: hovered && !selected ? 1 : 0,
                    transition: (t) =>
                      t.transitions.create(["border-color", "background-color", "box-shadow"], {
                        duration: t.transitions.duration.shortest,
                      }),
                    "&:hover": { borderColor: selected ? "divider" : "text.disabled", boxShadow: selected ? 0 : 1 },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 1 },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 3 }}>
                    <Typography variant="body1" noWrap sx={{ fontWeight: 600 }}>
                      {s.businessName}
                    </Typography>
                    <Typography variant="caption" sx={{ flexShrink: 0, fontWeight: 500, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                      {adjusted ? "—" : `${clock12(s.arrivalClock)}–${clock12(s.departureClock)}`}
                    </Typography>
                  </Box>
                  <Typography variant="caption" noWrap sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
                    {s.categoryLabel}
                  </Typography>
                  <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
                    <IntelligenceItineraryBadge intelligence={intelligenceByAccountId?.[s.accountId]} />
                    {s.isRevisit && <Badge tone="signal">Revisit</Badge>}
                    {warn && <Badge tone="signal">{s.openingHoursLabel}</Badge>}
                    {s.needsManualVerification && <Badge tone="outline">Verify</Badge>}
                  </Box>

                  {selected && (
                    <Box className="nv-fade-in" sx={{ mt: 3, pt: 3, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, borderTop: 1, borderColor: "divider" }}>
                      {onViewBrief && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewBrief(s.accountId);
                          }}
                          sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                        >
                          View brief
                        </Button>
                      )}
                      {s.googleMapsUrl && (
                        <Button
                          variant="outlined"
                          size="small"
                          component="a"
                          href={s.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          Open Maps
                        </Button>
                      )}

                      <Box component="span" sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton label="Move earlier" disabled={i === 0} onClick={() => onMove(s.accountId, -1)}>
                          <KeyboardArrowUpOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton label="Move later" disabled={i === stops.length - 1} onClick={() => onMove(s.accountId, 1)}>
                          <KeyboardArrowDownOutlined sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton label="Remove from today" onClick={() => onRemove(s.accountId)} danger>
                          <CloseOutlined sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          );
        })}
      </Box>

      {visitedNearby.length > 0 && <VisitedNearby entries={visitedNearby} stopCount={stops.length} />}
    </>
  );
}

const visitedDateFmt = new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Clinics near the start that the team already visited. They are skipped when the
 * day is built and other clinics take their place, so the rep sees why a nearby
 * clinic is not on the list and who was there.
 */
function VisitedNearby({ entries, stopCount }: { entries: VisitedNearbyEntry[]; stopCount: number }) {
  const mine = entries.filter((e) => e.mine).length;
  const team = entries.length - mine;
  const who = [mine > 0 ? `${mine} by you` : null, team > 0 ? `${team} by a teammate` : null].filter(Boolean).join(" · ");
  const filled =
    stopCount > 0
      ? "Skipped today and shown on the map with a check; other clinics took their place so your day stays full."
      : "Skipped today and shown on the map with a check. Nothing else qualified nearby — widen the search radius under Edit plan.";
  return (
    <Box component="section" sx={{ mx: 4, mb: 4, mt: 1, borderTop: 1, borderColor: "divider", pt: 3 }}>
      <Typography variant="eyebrow" component="h3" sx={{ display: "block" }}>
        Already visited nearby · {entries.length}
      </Typography>
      <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary", lineHeight: 1.6 }}>
        {who}. {filled}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 2, p: 0, display: "grid", gap: 1 }}>
        {entries.map((e) => (
          <Box component="li" key={e.accountId} sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 3, px: 3, py: 1.5, borderRadius: 1.5, bgcolor: "background.sunken" }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 500, color: "text.secondary" }}>
                {e.businessName}
              </Typography>
              <Typography variant="caption" noWrap sx={{ display: "block", color: "text.faint" }}>
                {e.city} · {km(e.distanceKm)} away
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ flexShrink: 0, color: e.mine ? "primary.main" : "text.secondary", fontWeight: 500 }}>
              {e.visitedBy} · {visitedDateFmt.format(new Date(`${e.visitedOn}T00:00:00.000Z`))}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return <Box sx={{ display: "flex", width: 32, flexDirection: "column", alignItems: "center", flexShrink: 0 }}>{children}</Box>;
}

function RailLine() {
  return <Box aria-hidden sx={{ width: "1px", flex: 1, bgcolor: "divider" }} />;
}

function Node({ children, sx }: { children: React.ReactNode; sx?: Parameters<typeof Box>[0]["sx"] }) {
  return (
    <Box
      component="span"
      sx={[
        {
          display: "flex",
          width: NODE,
          height: NODE,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          typography: "caption",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

function IconButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  const button = (
    <MuiIconButton
      size="small"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{
        width: 32,
        height: 32,
        border: 1,
        borderColor: "divider",
        borderRadius: 0.75,
        bgcolor: "background.paper",
        color: danger ? "error.main" : "text.secondary",
        "&:hover": danger ? { bgcolor: "error.tint" } : { bgcolor: "background.sunken", color: "text.primary" },
        "&.Mui-disabled": { opacity: 0.35, borderColor: "divider" },
      }}
    >
      {children}
    </MuiIconButton>
  );
  // Tooltip needs an enabled child to listen on; disabled buttons wrap in a span.
  return disabled ? (
    button
  ) : (
    <Tooltip title={label}>{button}</Tooltip>
  );
}

const BADGE_TONE = {
  accent: { bgcolor: "primary.tint", color: "primary.main" },
  signal: { bgcolor: "warning.tint", color: "warning.main" },
  danger: { bgcolor: "error.tint", color: "error.main" },
  neutral: { bgcolor: "background.sunken", color: "text.primary" },
  outline: { bgcolor: "transparent", color: "text.secondary", border: 1, borderColor: "divider" },
} as const;

/**
 * Compact 4px-radius badge for itinerary cards and the clinic drawer (lead product,
 * revisit, verify). Tones follow the design system: accent = quality, signal = attention,
 * danger = stop, neutral = fact, outline = low-emphasis flag.
 */
export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof BADGE_TONE;
  children: React.ReactNode;
}) {
  return (
    <Chip
      size="small"
      label={children}
      sx={{
        height: 20,
        borderRadius: 0.5,
        fontWeight: 500,
        "& .MuiChip-label": { px: 1.5 },
        ...BADGE_TONE[tone],
      }}
    />
  );
}
