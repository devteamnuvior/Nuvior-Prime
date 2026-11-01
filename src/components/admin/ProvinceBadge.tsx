"use client";

import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { CANADA_VIEWBOX, PROVINCE_PATHS, PROVINCE_PATH_BY_CODE } from "./canadaProvinces";

const ALL_LABEL = "All provinces and territories";

/**
 * Mini map of Canada with zero or more provinces highlighted. With `all`, the whole country is
 * filled. Purely decorative: callers put the accessible name on the wrapper.
 */
export function CanadaMap({ highlight = [], all = false, width = 40 }: { highlight?: string[]; all?: boolean; width?: number }) {
  const height = Math.round(width * 0.8);
  const lit = new Set(highlight);
  return (
    <Box component="svg" viewBox={CANADA_VIEWBOX} width={width} height={height} aria-hidden focusable="false" sx={{ display: "block", overflow: "visible" }}>
      {PROVINCE_PATHS.map((p) => {
        const on = all || lit.has(p.code);
        return (
          <Box
            key={p.code}
            component="path"
            d={p.d}
            strokeWidth={0.8}
            strokeLinejoin="round"
            sx={(t) => ({
              // `fill`/`stroke` are not palette-mapped by sx, so read the vars directly.
              fill: on ? (t.vars ?? t).palette.grey[500] : (t.vars ?? t).palette.grey[300],
              stroke: (t.vars ?? t).palette.background.paper,
              transition: t.transitions.create("fill", {
                duration: t.transitions.duration.short,
              }),
            })}
          />
        );
      })}
    </Box>
  );
}

/** Bounding box of a path made only of absolute M/L commands (what canadaProvinces.ts emits). */
function pathBounds(d: string) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** A single province on its own, scaled to fill the badge. Decorative; the wrapper carries the name. */
export function ProvinceShape({ code, width = 34, height = 26 }: { code: string; width?: number; height?: number }) {
  const path = PROVINCE_PATH_BY_CODE[code];
  if (!path) return null;
  const b = pathBounds(path.d);
  const pad = Math.max(b.width, b.height) * 0.06;
  return (
    <Box
      component="svg"
      viewBox={`${b.minX - pad} ${b.minY - pad} ${b.width + pad * 2} ${b.height + pad * 2}`}
      preserveAspectRatio="xMidYMid meet"
      width={width}
      height={height}
      aria-hidden
      focusable="false"
      sx={{ display: "block" }}
    >
      <Box component="path" d={path.d} strokeLinejoin="round" sx={(t) => ({ fill: (t.vars ?? t).palette.grey[500] })} />
    </Box>
  );
}

function Badge({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Tooltip title={label} arrow>
      <Box
        role="img"
        aria-label={label}
        tabIndex={0}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 32,
          borderRadius: 1,
          cursor: "default",
          outline: "none",
          transition: (t) => t.transitions.create("transform", { duration: t.transitions.duration.short }),
          "&:hover, &:focus-visible": { transform: "scale(1.12)" },
          "&:focus-visible": { boxShadow: (t) => `0 0 0 2px ${(t.vars ?? t).palette.action.focus}` },
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}

/**
 * Territory cell: one badge per province showing that province's own outline, a single filled
 * Canada map for users who cover every province, and a "+N" overflow with the remaining names.
 */
export function TerritoryBadges({ codes, max = 3 }: { codes: string[]; max?: number }) {
  if (codes.includes("*")) {
    return (
      <Badge label={ALL_LABEL}>
        <CanadaMap all width={38} />
      </Badge>
    );
  }
  if (codes.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: "text.disabled" }}>
        None
      </Typography>
    );
  }
  const shown = codes.slice(0, max);
  const rest = codes.slice(max);
  const nameOf = (c: string) => PROVINCE_PATH_BY_CODE[c]?.name ?? c;
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
      {shown.map((c) => (
        <Badge key={c} label={nameOf(c)}>
          <ProvinceShape code={c} />
        </Badge>
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.map(nameOf).join(", ")} arrow>
          <Typography
            variant="caption"
            tabIndex={0}
            sx={{
              color: "text.secondary",
              fontFamily: "var(--mono)",
              outline: "none",
            }}
          >
            +{rest.length}
          </Typography>
        </Tooltip>
      )}
    </Box>
  );
}
