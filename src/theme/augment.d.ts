import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypeBackground {
    /** Recessed wells, map backdrop, table header fills. */
    sunken: string;
    /** Inverse surface: monogram, selected marker, tooltips. */
    inverse: string;
  }
  interface TypeText {
    /** Tertiary text, placeholders, eyebrows. */
    faint: string;
  }
  interface Palette {
    sidebar: { bg: string; border: string; activeBg: string; activeFg: string };
  }
  interface PaletteOptions {
    sidebar?: { bg: string; border: string; activeBg: string; activeFg: string };
  }
  interface TypographyVariants {
    eyebrow: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    eyebrow?: React.CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    eyebrow: true;
    h5: false;
    h6: false;
  }
}
