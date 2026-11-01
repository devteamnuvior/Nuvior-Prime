/**
 * NUVIOR Prime design tokens — single source of truth for the MUI theme.
 * Components never hardcode colours, sizes, radii or shadows; they read from
 * `theme` (or `theme.vars`) which is built from these values in theme.ts.
 */

/* ---------- Primitive ramps ---------- */
export const neutral = {
  0: "#ffffff",
  50: "#faf9f6",
  100: "#f1efe9",
  200: "#e2dfd6",
  300: "#cbc8bf",
  400: "#9aa1a0",
  500: "#6b7273",
  600: "#4c5453",
  700: "#343b3a",
  800: "#222928",
  900: "#191c1c",
  950: "#0e1211",
} as const;

export const teal = {
  50: "#e9efec",
  100: "#d3e2dd",
  300: "#7fb5a8",
  400: "#3fa390",
  500: "#1f7366",
  600: "#14594f",
  700: "#0f4a42",
  900: "#16211f",
} as const;

export const amber = { 50: "#f6efe1", 400: "#d9a24e", 600: "#8a5a1c", 900: "#2c2416" } as const;
export const red = { 50: "#f7eae7", 400: "#e07566", 600: "#9c3a2c", 900: "#311c19" } as const;
export const green = { 50: "#e6f2ea", 400: "#5cb88a", 600: "#2f7d4f", 900: "#16302b" } as const;
export const blue = { 50: "#e6eef5", 400: "#6aa3d8", 600: "#2f5f8f", 900: "#162a3b" } as const;

/* ---------- Semantic palette (light only) ---------- */
export const lightPalette = {
  mode: "light" as const,
  primary: { main: teal[600], dark: teal[700], light: teal[400], contrastText: neutral[0], tint: teal[50] },
  secondary: { main: neutral[700], dark: neutral[900], light: neutral[500], contrastText: neutral[0], tint: neutral[100] },
  success: { main: green[600], light: green[400], dark: "#25653f", contrastText: neutral[0], tint: green[50] },
  warning: { main: amber[600], light: amber[400], dark: "#6f4714", contrastText: neutral[0], tint: amber[50] },
  error: { main: red[600], light: red[400], dark: "#7d2e23", contrastText: neutral[0], tint: red[50] },
  info: { main: blue[600], light: blue[400], dark: "#244a70", contrastText: neutral[0], tint: blue[50] },
  grey: {
    50: neutral[50],
    100: neutral[100],
    200: neutral[200],
    300: neutral[300],
    400: neutral[400],
    500: neutral[500],
    600: neutral[600],
    700: neutral[700],
    800: neutral[800],
    900: neutral[900],
  },
  background: { default: neutral[50], paper: neutral[0], sunken: neutral[100], inverse: teal[900] },
  text: { primary: neutral[900], secondary: neutral[500], disabled: neutral[400], faint: neutral[400] },
  divider: neutral[200],
  action: {
    hover: "rgba(22, 28, 27, 0.04)",
    selected: "rgba(20, 89, 79, 0.10)",
    focus: "rgba(20, 89, 79, 0.16)",
  },
  sidebar: { bg: neutral[0], border: neutral[200], activeBg: teal[50], activeFg: teal[600] },
};

/* ---------- Spacing, radius, elevation, motion ---------- */
export const SPACING_UNIT = 4; // theme.spacing(1) === 4px

export const RADIUS = { sm: 6, md: 8, lg: 12, xl: 16 } as const;

/** Three elevation levels: resting card, floating panel, overlay. */
export const SHADOWS = {
  level1: "0 1px 2px rgb(22 28 27 / 0.06)",
  level2: "0 2px 6px rgb(22 28 27 / 0.07), 0 8px 20px rgb(22 28 27 / 0.08)",
  level3: "0 2px 6px rgb(22 28 27 / 0.07), 0 12px 32px rgb(22 28 27 / 0.14)",
} as const;

export const MOTION = { fast: 150, normal: 200, slow: 250 } as const;
export const EASE = "cubic-bezier(0.2, 0.8, 0.3, 1)";

/* ---------- Typography ---------- */
export const FONT_SANS = 'var(--font-sans-loaded), "Inter", ui-sans-serif, system-ui, sans-serif';
export const FONT_MONO = 'var(--font-mono-loaded), "IBM Plex Mono", ui-monospace, Menlo, monospace';
export const FONT_SERIF = 'var(--font-serif-loaded), "Fraunces", Georgia, serif';

/* ---------- Layout ---------- */
export const LAYOUT = {
  sidebarWidth: 240,
  sidebarCollapsedWidth: 64,
  headerHeight: 56,
} as const;
