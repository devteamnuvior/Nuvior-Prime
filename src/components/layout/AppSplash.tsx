"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import { teal } from "@/theme/tokens";
import { SPLASH_SEEN_KEY, splashRecentlyPlayed } from "@/lib/nativeApp";
import { BrandMark } from "./BrandMark";

/** Same colours, top to bottom, as the native launch image (ios/App/App/Assets.xcassets/Splash.imageset). */
export const SPLASH_GRADIENT = `linear-gradient(180deg, ${teal[500]} 0%, ${teal[700]} 100%)`;

const rise = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;
const breathe = keyframes`
  from { transform: scale(0.9); }
  to { transform: scale(1); }
`;
/* A tiny route traces one of the arterials, pauses, and starts again. */
const trace = keyframes`
  0% { stroke-dashoffset: 1; opacity: 0; }
  8% { opacity: 1; }
  70% { stroke-dashoffset: 0; opacity: 1; }
  85% { opacity: 0; }
  100% { stroke-dashoffset: 0; opacity: 0; }
`;

/** The route the trace follows; also drawn into the map as an arterial. */
const ROUTE_D = "M-10 338C100 300 200 372 320 318S520 250 610 286";

const STREET_LINES = [40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560];

/**
 * Faint street map under the name, like a muted map tile: arterials, a ring
 * road, a river, diagonals and a grid of side streets. The map itself is a
 * static background; the route trace is a separate SVG on top.
 */
const STREET_MAP = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">' +
    // side streets
    '<g stroke-width="0.9" opacity="0.5">' +
    STREET_LINES.map((x) => `<path d="M${x} 0V600"/>`).join("") +
    STREET_LINES.map((y) => `<path d="M0 ${y}H600"/>`).join("") +
    "</g>" +
    // diagonals and secondary roads
    '<g stroke-width="1.6" opacity="0.8">' +
    '<path d="M0 60L600 420"/><path d="M60 600L600 120"/><path d="M0 500L300 200"/>' +
    '<path d="M420 0C400 120 470 200 440 330S500 520 470 600"/>' +
    '<path d="M0 180C140 160 220 220 330 200S500 150 600 190"/>' +
    "</g>" +
    // arterials and ring road
    '<g stroke-width="3">' +
    `<path d="${ROUTE_D}"/>` +
    '<path d="M250 0C240 110 300 190 280 300S240 500 260 600"/>' +
    '<path d="M110 110H490V490H110Z" stroke-width="2.2"/>' +
    "</g>" +
    // river
    '<path d="M-20 470C100 440 160 520 280 500S470 420 620 450" stroke-width="9" opacity="0.5"/>' +
    // blocks and a park
    '<g fill="#fff" stroke="none" opacity="0.2">' +
    '<rect x="132" y="132" width="36" height="36" rx="3"/><rect x="372" y="192" width="48" height="36" rx="3"/>' +
    '<rect x="192" y="372" width="36" height="48" rx="3"/><rect x="432" y="432" width="36" height="36" rx="3"/>' +
    '<rect x="52" y="252" width="28" height="60" rx="3"/><rect x="520" y="60" width="40" height="40" rx="3"/>' +
    '<rect x="330" y="60" width="60" height="28" rx="3"/><rect x="60" y="530" width="60" height="36" rx="3"/>' +
    '<path d="M490 330C530 320 560 350 560 390S520 450 490 440 450 380 490 330Z"/>' +
    "</g>" +
    "</svg>",
);

/** Logo draws in ~1.4s, the name rises under it, then the splash fades out. */
const HOLD_MS = 2000;
const FADE_MS = 450;

let seenThisLoad: boolean | null = null;

/**
 * Launch splash for the iOS app: green gradient, the route logo drawing
 * itself and "Nuvior Prime" underneath. Rendered by the root layout for app
 * requests only, plays on each launch (not on the reload right after sign-in),
 * then gets out of the way.
 */
export function AppSplash() {
  const [phase, setPhase] = useState<"show" | "leaving" | "gone">("show");

  useEffect(() => {
    // Decided once per page load, so a remounted effect (React dev / Strict Mode) doesn't read its own timestamp.
    if (seenThisLoad === null) {
      seenThisLoad = false;
      try {
        seenThisLoad = splashRecentlyPlayed(window.sessionStorage.getItem(SPLASH_SEEN_KEY), Date.now());
        if (!seenThisLoad) window.sessionStorage.setItem(SPLASH_SEEN_KEY, String(Date.now()));
      } catch {
        /* private mode — just play it */
      }
    }
    const seen = seenThisLoad;
    if (seen) {
      setPhase("gone");
      return;
    }
    const leave = window.setTimeout(() => setPhase("leaving"), HOLD_MS);
    const gone = window.setTimeout(() => setPhase("gone"), HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <Box
      id="nv-splash"
      aria-hidden
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2.5,
        background: SPLASH_GRADIENT,
        color: "#fff",
        opacity: phase === "leaving" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: phase === "leaving" ? "none" : "auto",
        // A reload within the same launch skips the splash before first paint (see SPLASH_SEEN_SCRIPT).
        "html[data-splash-seen] &": { display: "none" },
      }}
    >
      {/* Street map, starting below the name and fading out before it reaches the logo. */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          top: "calc(50% + 110px)",
          maskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0) 100%)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,${STREET_MAP}")`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            opacity: 0.1,
          }}
        />
        {/* Route trace: same viewBox and cover-fit as the map, so it rides exactly on the arterial. */}
        <Box
          component="svg"
          viewBox="0 0 600 600"
          preserveAspectRatio="xMidYMin slice"
          sx={{
            position: "absolute",
            inset: 0,
            width: 1,
            height: 1,
            overflow: "visible",
            opacity: 0.45,
            "& path": { animation: `${trace} 6s ease-in-out 900ms infinite` },
            "@media (prefers-reduced-motion: reduce)": { "& path": { animation: "none", opacity: 1 } },
          }}
        >
          <path d={ROUTE_D} pathLength={1} fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeDasharray={1} opacity={0} />
        </Box>
      </Box>
      <Box
        sx={{
          position: "relative",
          animation: `${breathe} 1400ms cubic-bezier(0.2, 0.8, 0.3, 1) both`,
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        <BrandMark size={112} color="#fff" />
      </Box>
      <Typography
        component="p"
        sx={{
          position: "relative",
          m: 0,
          fontSize: "1.375rem",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          animation: `${rise} 500ms ease-out 1100ms both`,
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      >
        Nuvior Prime
      </Typography>
    </Box>
  );
}
