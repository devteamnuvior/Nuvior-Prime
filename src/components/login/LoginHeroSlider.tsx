"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";

/**
 * Login cover: three Unsplash photos cross-fade, each drifting gently back and forth
 * (a slow pan + light zoom). All photos are free to use under the Unsplash License and
 * served from the Unsplash CDN, so nothing is stored in the repo.
 */
const SLIDES = [
  {
    // CN Tower above the clouds, Toronto — mwangi gatheca
    // https://unsplash.com/photos/cn-tower-skyline-in-toronto-qlKaN7eqay8
    src: "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1800&q=80",
    position: "50% 40%",
  },
  {
    // False Creek waterfront and Vancouver skyline at golden hour — Adrian Yu
    // https://unsplash.com/photos/an-aerial-view-of-a-city-and-a-harbor-Wc45W-dQFlA
    src: "https://images.unsplash.com/photo-1647655806923-e8202f4f2b8c?auto=format&fit=crop&w=1800&q=80",
    position: "50% 50%",
  },
  {
    // Montreal skyline from the belvedere — Grant Van Cleemput
    // https://unsplash.com/photos/a-city-with-many-tall-buildings-CL9Pl-5fXBU
    src: "https://images.unsplash.com/photo-1659482513037-950fea76794c?auto=format&fit=crop&w=1800&q=80",
    position: "50% 45%",
  },
] as const;

const INTERVAL_MS = 7000;
const FADE_MS = 1400;

/* Slow drift: pan a little to one side and zoom in, then come back. Alternates per slide. */
const driftLeft = keyframes`
  0% { transform: scale(1.06) translateX(0); }
  50% { transform: scale(1.12) translateX(-2.5%); }
  100% { transform: scale(1.06) translateX(0); }
`;
const driftRight = keyframes`
  0% { transform: scale(1.06) translateX(0); }
  50% { transform: scale(1.12) translateX(2.5%); }
  100% { transform: scale(1.06) translateX(0); }
`;

export function LoginHeroSlider() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", bgcolor: "background.inverse" }} aria-hidden="true">
      {SLIDES.map((slide, i) => {
        const active = i === index;
        return (
          <Box
            key={slide.src}
            component="img"
            src={slide.src}
            alt=""
            decoding="async"
            fetchPriority={i === 0 ? "high" : "low"}
            loading={i === 0 ? "eager" : "lazy"}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: slide.position,
              display: "block",
              opacity: active ? 1 : 0,
              transition: (t) => t.transitions.create("opacity", { duration: FADE_MS, easing: t.transitions.easing.easeInOut }),
              animation: `${i % 2 === 0 ? driftLeft : driftRight} 16s ease-in-out infinite`,
              willChange: "transform, opacity",
              "@media (prefers-reduced-motion: reduce)": { animation: "none", transform: "scale(1.06)" },
            }}
          />
        );
      })}
      {/* Soft tint so the form panel edge reads cleanly over bright skies */}
      <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to right, rgba(13, 26, 36, 0.28) 0%, rgba(13, 26, 36, 0) 35%)" }} />
      {/* Dots */}
      <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 20, display: "flex", justifyContent: "center", gap: 1.5 }}>
        {SLIDES.map((s, i) => (
          <Box
            key={s.src}
            sx={{
              width: i === index ? 20 : 6,
              height: 6,
              borderRadius: 3,
              bgcolor: "common.white",
              opacity: i === index ? 0.9 : 0.45,
              transition: (t) => t.transitions.create(["width", "opacity"], { duration: t.transitions.duration.standard }),
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
