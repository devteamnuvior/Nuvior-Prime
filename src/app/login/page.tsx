import { Suspense } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LoginForm } from "@/components/LoginForm";
import { BrandMark, BrandWordmark } from "@/components/layout/BrandMark";

/**
 * Hero photo: CN Tower above the clouds, Toronto — by mwangi gatheca on Unsplash
 * (Unsplash License, free to use). Served from the Unsplash CDN, so no file is
 * stored in the repo and next/image remote config is not needed.
 * https://unsplash.com/photos/cn-tower-skyline-in-toronto-qlKaN7eqay8
 */
const HERO_PHOTO = "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1800&q=80";

export default function LoginPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: { xs: "220px 1fr", lg: "1fr" },
        gridTemplateColumns: { lg: "minmax(0, 1fr) minmax(0, 1.05fr)" },
        bgcolor: "background.default",
      }}
    >
      <Box
        component="section"
        sx={{
          order: { xs: 2, lg: 1 },
          position: "relative",
          display: "flex",
          flexDirection: "column",
          px: { xs: 6, sm: 12, lg: 18 },
          py: { xs: 7, sm: 9, lg: 11 },
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            width: 520,
            height: 520,
            left: -200,
            top: -180,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(var(--nv-palette-primary-mainChannel) / 0.14), transparent)",
            pointerEvents: "none",
          },
        }}
      >
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 3 }}>
          <BrandMark size={40} />
          <Box>
            <BrandWordmark />
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
              Territory planning for field sales
            </Typography>
          </Box>
        </Box>

        <Box sx={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", width: 1, maxWidth: 400, mx: "auto", py: 10 }}>
          <Suspense fallback={<Typography sx={{ color: "text.secondary" }}>Loading…</Typography>}>
            <LoginForm />
          </Suspense>
        </Box>

        <Box sx={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 3 }}>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            © {new Date().getFullYear()} NUVIOR · Canada
          </Typography>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            Authorized representatives only
          </Typography>
        </Box>
      </Box>

      <Box
        component="aside"
        aria-hidden="true"
        sx={{
          order: { xs: 1, lg: 2 },
          position: { xs: "relative", lg: "sticky" },
          top: 0,
          height: { lg: "100dvh" },
          overflow: "hidden",
          bgcolor: "background.inverse",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN image, intentionally unoptimized */}
        <img
          src={HERO_PHOTO}
          alt=""
          decoding="async"
          fetchPriority="high"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 40%", display: "block" }}
        />
        <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to right, rgba(13, 26, 36, 0.28) 0%, rgba(13, 26, 36, 0) 35%)" }} />
      </Box>
    </Box>
  );
}
