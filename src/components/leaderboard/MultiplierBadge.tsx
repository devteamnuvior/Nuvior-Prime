import Box from "@mui/material/Box";

/** "×2" tile that fronts a challenge card: filled while the challenge is active, muted otherwise. */
export function MultiplierBadge({ multiplier, active, size = 48 }: { multiplier: number; active: boolean; size?: number }) {
  return (
    <Box
      aria-label={`${multiplier} times`}
      sx={{
        width: size,
        height: size,
        borderRadius: 2.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontWeight: 700,
        fontSize: size * 0.34,
        letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
        color: active ? "primary.contrastText" : "text.secondary",
        bgcolor: active ? "primary.main" : "background.sunken",
        backgroundImage: active ? "linear-gradient(135deg, var(--nv-palette-primary-light) -60%, var(--nv-palette-primary-main) 50%, var(--nv-palette-primary-dark) 140%)" : "none",
        boxShadow: active ? "0 6px 14px -6px rgba(var(--nv-palette-primary-mainChannel) / 0.6)" : "none",
      }}
    >
      ×{multiplier}
    </Box>
  );
}
