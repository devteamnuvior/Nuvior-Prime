"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";

/* Route draws itself from the start pin to the finish pin; pins drop in at each end. */
const draw = keyframes`
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
`;
const drop = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.6); }
  60% { opacity: 1; transform: translateY(1px) scale(1.05); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const EASE = "cubic-bezier(0.2, 0.8, 0.3, 1)";

/**
 * NUVIOR route logo (Logo-Path.svg): start pin → route → finish pin.
 * Plays once on mount and replays on hover (the drawing is remounted). Colour defaults to `primary.main`.
 */
export function BrandMark({ size = 36, animate = true, color = "primary.main" }: { size?: number; animate?: boolean; color?: string }) {
  // Bumping the key remounts the drawing, which restarts the CSS animations.
  const [run, setRun] = React.useState(0);
  return (
    <Box
      component="svg"
      viewBox="7 3 50 58"
      width={size}
      height={size}
      role="img"
      aria-label="NUVIOR route logo"
      onMouseEnter={animate ? () => setRun((r) => r + 1) : undefined}
      sx={{
        display: "block",
        flexShrink: 0,
        color,
        overflow: "visible",
        "& .route": { strokeDasharray: 1 },
        "& .pin": { transformBox: "fill-box", transformOrigin: "50% 100%" },
        ...(animate && {
          "& .route": { strokeDasharray: 1, animation: `${draw} 900ms ${EASE} 250ms both` },
          "& .pin-start": { animation: `${drop} 450ms ${EASE} 0ms both` },
          "& .pin-finish": { animation: `${drop} 450ms ${EASE} 950ms both` },
          "@media (prefers-reduced-motion: reduce)": {
            "& .route, & .pin-start, & .pin-finish": { animation: "none" },
          },
        }),
      }}
    >
      <g key={run}>
        <path
          className="route"
          pathLength={1}
          d="M16 47 C18 41 21 38 25 39 C29 40 31 44 34 41 C37 38 33 31 37 27 C40 24 44 26 46 22 C47 20 47.5 18 48 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g className="pin pin-start">
          <path
            d="M16 42 C12.7 42 10.4 44.5 10.4 47.7 C10.4 51.7 16 58 16 58 S21.6 51.7 21.6 47.7 C21.6 44.5 19.3 42 16 42Z"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <circle cx="16" cy="47.3" r="1.8" fill="currentColor" />
        </g>
        <g className="pin pin-finish">
          <path
            d="M48 6 C44.7 6 42.4 8.5 42.4 11.7 C42.4 15.7 48 22 48 22 S53.6 15.7 53.6 11.7 C53.6 8.5 51.3 6 48 6Z"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <circle cx="48" cy="11.3" r="1.8" fill="currentColor" />
        </g>
      </g>
    </Box>
  );
}

export function BrandWordmark() {
  return (
    <Typography
      component="span"
      sx={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", whiteSpace: "nowrap" }}
    >
      Nuvior{" "}
      <Box component="span" sx={{ color: "primary.main" }}>
        Prime
      </Box>
    </Typography>
  );
}
