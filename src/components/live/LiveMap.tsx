"use client";

import { useEffect, useMemo, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CropFreeOutlined from "@mui/icons-material/CropFreeOutlined";
import type { GeoPoint } from "@/domain/geo";
import { countByStatus, isRecent, sortReps, type LiveSnapshot } from "@/domain/live/positions";
import { getBrowserMapsConfig } from "@/lib/mapsConfig";
import { avatarHue, initialsOf } from "@/components/admin/userPresentation";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusChip } from "@/components/feedback/StatusChip";
import { MAP_Z } from "@/components/today/mapChrome";
import { LAYOUT } from "@/theme/tokens";
import { LiveMapCanvas } from "./LiveMapCanvas";
import { RepPanel } from "./RepPanel";
import { TargetStrip } from "./TargetStrip";
import type { FocusRequest, LiveMarker } from "./liveTypes";
import { useAnimatedPositions, useLiveReps } from "./useLiveReps";

const CANADA_CENTER: GeoPoint = { lat: 56.1304, lng: -96.3468 };
const PROVINCE_CENTERS: Record<string, GeoPoint> = {
  ON: { lat: 43.6532, lng: -79.3832 },
  QC: { lat: 45.5019, lng: -73.5674 },
  BC: { lat: 49.2827, lng: -123.1207 },
  AB: { lat: 51.0447, lng: -114.0719 },
  MB: { lat: 49.8951, lng: -97.1384 },
  SK: { lat: 52.1332, lng: -106.67 },
  NS: { lat: 44.6488, lng: -63.5752 },
  NB: { lat: 45.9636, lng: -66.6431 },
  NL: { lat: 47.5615, lng: -52.7126 },
  PE: { lat: 46.2382, lng: -63.1311 },
};

const blink = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.8); }
`;
const REDUCED = "@media (prefers-reduced-motion: reduce)";

const PANEL_WIDTH = 340;

export function LiveMap({
  initial,
  provinceCode: initialProvince,
  provinceOptions,
}: {
  initial: LiveSnapshot;
  provinceCode: string;
  provinceOptions: { code: string; name: string }[];
}) {
  const mapsCfg = getBrowserMapsConfig();
  const [provinceCode, setProvinceCode] = useState(initialProvince);
  const { reps, targets: targetProgress, day, connection, now } = useLiveReps(initial, provinceCode);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest>(null);
  const [fitNonce, setFitNonce] = useState(0);
  const [query, setQuery] = useState("");

  // Keep the URL shareable without a server round-trip.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (provinceCode === "*") url.searchParams.delete("province");
    else url.searchParams.set("province", provinceCode);
    window.history.replaceState(window.history.state, "", url);
  }, [provinceCode]);

  // Refit whenever the province changes so the new set of reps is in view.
  useEffect(() => {
    if (provinceCode !== initialProvince) setFitNonce((n) => n + 1);
    setSelectedId(null);
  }, [provinceCode, initialProvince]);

  const located = useMemo(() => reps.filter((r) => r.position), [reps]);
  const targets = useMemo(() => new Map(located.map((r) => [r.id, { lat: r.position!.lat, lng: r.position!.lng }])), [located]);
  const display = useAnimatedPositions(targets);

  const recentIds = useMemo(() => new Set(located.filter((r) => isRecent(r.position!.recordedAt, now)).map((r) => r.id)), [located, now]);

  const markers: LiveMarker[] = useMemo(
    () =>
      located.map((r) => {
        const pos = display.get(r.id) ?? { lat: r.position!.lat, lng: r.position!.lng };
        return {
          id: r.id,
          name: r.name,
          initials: initialsOf(r.name, r.email),
          hue: avatarHue(r.email || r.name),
          status: r.status,
          recent: recentIds.has(r.id),
          headingDeg: r.position!.headingDeg,
          clinicName: r.position!.clinic?.name ?? null,
          lat: pos.lat,
          lng: pos.lng,
        };
      }),
    [located, display, recentIds],
  );

  const counts = countByStatus(reps);
  const q = query.trim().toLowerCase();
  const panelReps = useMemo(
    () => sortReps(reps.filter((r) => !q || r.name.toLowerCase().includes(q) || r.position?.clinic?.name.toLowerCase().includes(q))),
    [reps, q],
  );

  const fallbackCenter = PROVINCE_CENTERS[provinceCode] ?? CANADA_CENTER;

  const focusRep = (id: string) => {
    setSelectedId(id);
    setFocus((f) => ({ id, nonce: (f?.nonce ?? 0) + 1 }));
  };

  const content = (
    <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", maxHeight: { md: `calc(100dvh - ${LAYOUT.headerHeight}px)` } }}>
      {/* Status bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 3,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.default",
          px: { xs: 4, md: 6 },
          py: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0, flexWrap: "wrap" }}>
          <Tooltip title={connection === "live" ? "Refreshing every few seconds" : connection === "paused" ? "Paused while this tab is hidden" : "Lost contact with the server — retrying"}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
              <Box
                aria-hidden
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: connection === "live" ? "success.main" : connection === "paused" ? "text.disabled" : "warning.main",
                  animation: connection === "live" ? `${blink} 2s ease-in-out infinite` : "none",
                  [REDUCED]: { animation: "none" },
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {connection === "live" ? "Live" : connection === "paused" ? "Paused" : "Reconnecting"}
              </Typography>
            </Box>
          </Tooltip>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <StatusChip tone="success" label={`${counts.at_clinic} At Clinic`} />
            <StatusChip tone="primary" label={`${counts.travelling} Travelling`} />
            <StatusChip tone="warning" label={`${counts.idle} Idle`} />
            {counts.offline > 0 && <StatusChip tone="neutral" label={`${counts.offline} Offline`} />}
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {provinceOptions.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <Select value={provinceCode} onChange={(e) => setProvinceCode(String(e.target.value))} inputProps={{ "aria-label": "Province" }}>
                {provinceOptions.map((p) => (
                  <MenuItem key={p.code} value={p.code}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Button variant="outlined" size="small" startIcon={<CropFreeOutlined />} onClick={() => setFitNonce((n) => n + 1)} disabled={markers.length === 0}>
            Fit all
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: { xs: "column", md: "row" } }}>
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 }}>
          {/* Target cards: team totals, or the focused rep's own targets. */}
          <TargetStrip reps={reps} targets={targetProgress} day={day} selectedId={selectedId} onShowTeam={() => setSelectedId(null)} />
          <Box sx={{ position: "relative", minHeight: 280, height: { xs: "52dvh", md: "auto" }, flex: 1 }}>
            <LiveMapCanvas markers={markers} selectedId={selectedId} onSelect={(id) => (id ? focusRep(id) : setSelectedId(null))} fitNonce={fitNonce} focus={focus} fallbackCenter={fallbackCenter} />
            {located.length === 0 && <NoPositionsOverlay provinceName={provinceCode === "*" ? null : (provinceOptions.find((p) => p.code === provinceCode)?.name ?? provinceCode)} />}
          </Box>
        </Box>
        <Box
          component="aside"
          aria-label="Reps"
          sx={{
            width: { xs: 1, md: PANEL_WIDTH },
            flexShrink: 0,
            minHeight: 0,
            borderLeft: { md: 1 },
            borderTop: { xs: 1, md: 0 },
            borderColor: { xs: "divider", md: "divider" },
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <RepPanel reps={panelReps} selectedId={selectedId} recentIds={recentIds} query={query} onQuery={setQuery} onFocus={focusRep} now={now} />
        </Box>
      </Box>
    </Box>
  );

  return mapsCfg.enabled ? (
    <APIProvider apiKey={mapsCfg.apiKey} region="CA" language="en">
      {content}
    </APIProvider>
  ) : (
    content
  );
}


/**
 * Shown over the basemap while nobody has a position. Positions only exist once a rep
 * turns on "Share location" on Today's Route, so an empty map is the expected first state
 * of a fresh deployment rather than a fault.
 */
function NoPositionsOverlay({ provinceName }: { provinceName: string | null }) {
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: MAP_Z.overlay, display: "flex", alignItems: "center", justifyContent: "center", p: 4, pointerEvents: "none" }}>
      <Paper variant="outlined" sx={{ maxWidth: 400, borderRadius: 3, boxShadow: 3, bgcolor: "background.paper", pointerEvents: "auto" }}>
        <EmptyState
          compact
          illustration="map"
          title="No live positions yet"
          description={
            <>
              {provinceName ? `No rep in ${provinceName} has shared a location yet.` : "No rep has shared a location yet."} Reps appear here within seconds of turning on{" "}
              <Box component="strong" sx={{ color: "text.primary", fontWeight: 600 }}>
                Share location
              </Box>{" "}
              on their Today&apos;s Route.
            </>
          }
        />
      </Paper>
    </Box>
  );
}
