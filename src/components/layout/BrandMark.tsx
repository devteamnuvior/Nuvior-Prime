import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { FONT_SERIF } from "@/theme/tokens";

/** The italic serif "N" monogram — the brand serif is reserved for this mark only. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 1.5,
        bgcolor: "background.inverse",
        color: "background.default",
        fontFamily: FONT_SERIF,
        fontStyle: "italic",
        fontSize: size * 0.54,
        lineHeight: 1,
      }}
    >
      N
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
