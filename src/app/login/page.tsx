import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LoginForm } from "@/components/LoginForm";
import { BrandMark, BrandWordmark } from "@/components/layout/BrandMark";
import { LoginHeroSlider } from "@/components/login/LoginHeroSlider";

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
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 2 }}>
          <BrandMark size={52} />
          <Box>
            <BrandWordmark />
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
              Territory planning for field sales
            </Typography>
          </Box>
        </Box>

        <Box sx={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", width: 1, maxWidth: 400, mx: "auto", py: 10 }}>
          <LoginForm />
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
        <LoginHeroSlider />
      </Box>
    </Box>
  );
}
