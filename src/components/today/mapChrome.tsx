"use client";

import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddOutlined from "@mui/icons-material/AddOutlined";
import RemoveOutlined from "@mui/icons-material/RemoveOutlined";
import CropFreeOutlined from "@mui/icons-material/CropFreeOutlined";
import GpsFixedOutlined from "@mui/icons-material/GpsFixedOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";

/**
 * Stacking order inside the map container. Leaflet's own panes and controls end at 1000,
 * so everything the workspace floats over the map starts there. Kept below MUI's
 * `zIndex.drawer` (1200) and `zIndex.modal` (1300) so the app sidebar and dialogs win.
 */
export const MAP_Z = { controls: 1000, overlay: 1050, banner: 1060, drawer: 1100 } as const;

/** Zoom / fit / centre / external hand-off — identical chrome for Google and Leaflet. */
export function MapControls({
  onZoomIn,
  onZoomOut,
  onFit,
  onCenter,
  externalUrl,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onCenter: () => void;
  externalUrl: string | null;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ position: "absolute", top: 3, right: 3, zIndex: MAP_Z.controls, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 1, boxShadow: 1 }}
    >
      <MapButton label="Zoom in" onClick={onZoomIn}>
        <AddOutlined sx={{ fontSize: 18 }} />
      </MapButton>
      <MapButton label="Zoom out" onClick={onZoomOut}>
        <RemoveOutlined sx={{ fontSize: 18 }} />
      </MapButton>
      <Divider />
      <MapButton label="Fit route" onClick={onFit}>
        <CropFreeOutlined sx={{ fontSize: 16 }} />
      </MapButton>
      <MapButton label="Center on start" onClick={onCenter}>
        <GpsFixedOutlined sx={{ fontSize: 16 }} />
      </MapButton>
      {externalUrl && (
        <>
          <Divider />
          <MapButton label="Open in Google Maps" href={externalUrl}>
            <OpenInNewOutlined sx={{ fontSize: 15 }} />
          </MapButton>
        </>
      )}
    </Paper>
  );
}

function MapButton({
  label,
  onClick,
  href,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const sx = {
    width: 40,
    height: 40,
    borderRadius: 0,
    color: "text.secondary",
    "&:hover": { bgcolor: "background.sunken", color: "text.primary" },
  } as const;
  return (
    <Tooltip title={label} placement="left">
      {href ? (
        <IconButton component="a" href={href} target="_blank" rel="noreferrer" aria-label={label} sx={sx}>
          {children}
        </IconButton>
      ) : (
        <IconButton onClick={onClick} aria-label={label} sx={sx}>
          {children}
        </IconButton>
      )}
    </Tooltip>
  );
}

/** Honesty caption under the route when a schematic line stands in for road geometry. */
export function MapCaption({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{
        position: "absolute",
        bottom: 3,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: MAP_Z.controls,
        px: 3,
        py: 1,
        borderRadius: 999,
        border: 1,
        borderColor: "divider",
        bgcolor: "rgba(var(--nv-palette-background-paperChannel) / 0.9)",
        color: "text.secondary",
        fontWeight: 500,
        whiteSpace: "nowrap",
        boxShadow: 1,
      }}
    >
      {children}
    </Typography>
  );
}

/** Warning badge for non-production renderers (Google Demo key, Leaflet fallback). */
export function MapBadge({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="eyebrow"
      sx={{ position: "absolute", bottom: 3, left: 3, zIndex: MAP_Z.controls, px: 3, py: 1, borderRadius: 999, bgcolor: "warning.main", color: "warning.contrastText", boxShadow: 1, whiteSpace: "nowrap" }}
    >
      {children}
    </Typography>
  );
}

/** Fills the map slot while the renderer bundle loads. */
export function MapLoading() {
  return <Skeleton variant="rectangular" animation="pulse" aria-hidden sx={{ width: 1, height: 1, borderRadius: 0, bgcolor: "background.sunken" }} />;
}
