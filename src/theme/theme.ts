"use client";

import { createTheme, type Shadows } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  EASE,
  FONT_MONO,
  FONT_SANS,
  lightPalette,
  MOTION,
  RADIUS,
  SHADOWS,
  SPACING_UNIT,
} from "./tokens";

/* MUI expects 25 shadow slots; we only use three levels (1 → card, 2 → float, 3 → overlay). */
const shadows: Shadows = [
  "none",
  SHADOWS.level1,
  SHADOWS.level2,
  SHADOWS.level3,
  ...Array<string>(21).fill(SHADOWS.level3),
] as Shadows;

export const theme = createTheme({
  cssVariables: { cssVarPrefix: "nv" },
  palette: lightPalette,
  spacing: SPACING_UNIT,
  shape: { borderRadius: RADIUS.md },
  shadows,
  typography: {
    fontFamily: FONT_SANS,
    fontSize: 14,
    htmlFontSize: 16,
    h1: { fontSize: "1.5rem", lineHeight: 1.333, fontWeight: 600, letterSpacing: "-0.02em" },
    h2: { fontSize: "1.25rem", lineHeight: 1.4, fontWeight: 600, letterSpacing: "-0.01em" },
    h3: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 600 },
    h4: { fontSize: "0.875rem", lineHeight: 1.43, fontWeight: 600 },
    h5: undefined,
    h6: undefined,
    subtitle1: { fontSize: "0.875rem", lineHeight: 1.43, fontWeight: 500 },
    subtitle2: { fontSize: "0.8125rem", lineHeight: 1.4, fontWeight: 500 },
    body1: { fontSize: "0.875rem", lineHeight: 1.5 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.45 },
    caption: { fontSize: "0.75rem", lineHeight: 1.4 },
    overline: { fontSize: "0.6875rem", lineHeight: 1.45, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" },
    eyebrow: { fontSize: "0.6875rem", lineHeight: 1.45, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase" },
    button: { fontWeight: 500, textTransform: "none", letterSpacing: 0 },
  },
  transitions: {
    duration: {
      shortest: MOTION.fast,
      shorter: MOTION.fast,
      short: MOTION.normal,
      standard: MOTION.normal,
      complex: MOTION.slow,
      enteringScreen: MOTION.slow,
      leavingScreen: MOTION.normal,
    },
    easing: { easeInOut: EASE, easeOut: EASE, easeIn: "cubic-bezier(0.4, 0, 1, 1)", sharp: "cubic-bezier(0.4, 0, 0.6, 1)" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          backgroundColor: theme.vars.palette.background.default,
          color: theme.vars.palette.text.primary,
          fontFeatureSettings: '"cv11", "ss01"',
          WebkitFontSmoothing: "antialiased",
        },
        "::selection": { backgroundColor: theme.vars.palette.action.selected },
        ":focus-visible": { outline: `2px solid ${theme.vars.palette.primary.main}`, outlineOffset: 1 },
        code: { fontFamily: FONT_MONO },
      }),
    },
    MuiTypography: {
      defaultProps: {
        variantMapping: { eyebrow: "span", overline: "span" },
      },
      styleOverrides: {
        root: ({ theme, ownerState }) =>
          ownerState.variant === "eyebrow" ? { color: theme.vars.palette.text.faint, display: "inline-block" } : {},
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, size: "medium" },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: RADIUS.md,
          minHeight: 36,
          paddingInline: theme.spacing(4),
          transitionDuration: `${MOTION.fast}ms`,
          "&:focus-visible": { boxShadow: `0 0 0 2px ${theme.vars.palette.background.default}, 0 0 0 4px ${theme.vars.palette.primary.main}` },
        }),
        sizeSmall: { minHeight: 32, paddingInline: 12, fontSize: "0.8125rem" },
        sizeLarge: { minHeight: 44, paddingInline: 24, fontSize: "0.9375rem" },
        outlined: ({ theme }) => ({
          borderColor: theme.vars.palette.divider,
          backgroundColor: theme.vars.palette.background.paper,
          color: theme.vars.palette.text.primary,
          "&:hover": { backgroundColor: theme.vars.palette.background.sunken, borderColor: theme.vars.palette.divider },
        }),
        text: ({ theme }) => ({ color: theme.vars.palette.text.primary, "&:hover": { backgroundColor: theme.vars.palette.action.hover } }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: RADIUS.md,
          transitionDuration: `${MOTION.fast}ms`,
          "&:focus-visible": { boxShadow: `0 0 0 2px ${theme.vars.palette.primary.main}` },
        }),
        sizeSmall: { padding: 6 },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
      },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: ({ theme }) => ({ borderRadius: RADIUS.lg, boxShadow: theme.vars.shadows[1] }),
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { padding: "16px 20px 0" },
        title: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.43 },
        subheader: ({ theme }) => ({ fontSize: "0.8125rem", color: theme.vars.palette.text.secondary, marginTop: 2 }),
      },
    },
    MuiCardContent: { styleOverrides: { root: { padding: 20, "&:last-child": { paddingBottom: 20 } } } },
    MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
    MuiFormControl: { defaultProps: { size: "small" } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: "0.875rem" } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: RADIUS.md,
          backgroundColor: theme.vars.palette.background.paper,
          fontSize: "0.875rem",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: theme.vars.palette.divider },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme.vars.palette.text.disabled },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 1, borderColor: theme.vars.palette.primary.main, boxShadow: `0 0 0 3px ${theme.vars.palette.action.focus}` },
          "&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline": { boxShadow: `0 0 0 3px rgba(${theme.vars.palette.error.mainChannel} / 0.2)` },
        }),
        input: ({ theme }) => ({
          paddingBlock: 8.5,
          // Solid placeholder instead of MUI's 42% opacity so it matches text.disabled exactly.
          "&::placeholder": { color: theme.vars.palette.text.disabled, opacity: 1 },
        }),
      },
    },
    MuiFormHelperText: { styleOverrides: { root: { marginInline: 2, fontSize: "0.75rem" } } },
    MuiSelect: {
      defaultProps: { size: "small", IconComponent: ExpandMoreIcon },
      styleOverrides: { icon: ({ theme }) => ({ color: theme.vars.palette.text.disabled }) },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: RADIUS.sm, fontWeight: 500, height: 24, fontSize: "0.75rem" },
        sizeSmall: { height: 20, fontSize: "0.6875rem" },
        label: { paddingInline: 8 },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 200 },
      styleOverrides: {
        tooltip: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.inverse,
          color: theme.vars.palette.background.default,
          fontSize: "0.75rem",
          fontWeight: 500,
          borderRadius: RADIUS.sm,
          padding: "6px 10px",
        }),
        arrow: ({ theme }) => ({ color: theme.vars.palette.background.inverse }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({ borderRadius: RADIUS.xl, border: `1px solid ${theme.vars.palette.divider}`, boxShadow: theme.vars.shadows[3] }),
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: "1rem", fontWeight: 600, padding: "20px 24px 8px" } } },
    MuiDialogContent: { styleOverrides: { root: { padding: "8px 24px 16px" } } },
    MuiDialogActions: { styleOverrides: { root: { padding: "8px 24px 20px", gap: 8 } } },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({ backgroundImage: "none", boxShadow: theme.vars.shadows[3] }),
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({ borderRadius: RADIUS.lg, border: `1px solid ${theme.vars.palette.divider}`, boxShadow: theme.vars.shadows[2], marginTop: 4 }),
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { borderRadius: RADIUS.sm, fontSize: "0.8125rem", minHeight: 34, paddingInline: 10, gap: 8 },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 0, marginRight: 10, color: "inherit" } } },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: RADIUS.md,
          minHeight: 36,
          paddingBlock: 6,
          transitionDuration: `${MOTION.fast}ms`,
          "&.Mui-selected": {
            backgroundColor: theme.vars.palette.sidebar.activeBg,
            color: theme.vars.palette.sidebar.activeFg,
            "&:hover": { backgroundColor: theme.vars.palette.sidebar.activeBg },
          },
        }),
      },
    },
    MuiAppBar: {
      defaultProps: { color: "transparent", elevation: 0, position: "sticky" },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: `rgba(${theme.vars.palette.background.defaultChannel} / 0.85)`,
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
          color: theme.vars.palette.text.primary,
        }),
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          "& .MuiTableCell-head": {
            backgroundColor: theme.vars.palette.background.paper,
            color: theme.vars.palette.text.faint,
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({ borderBottomColor: theme.vars.palette.divider, padding: "10px 12px", fontSize: "0.875rem" }),
      },
    },
    MuiSkeleton: { defaultProps: { animation: "wave" }, styleOverrides: { root: { borderRadius: RADIUS.sm } } },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: RADIUS.md, fontSize: "0.8125rem", alignItems: "flex-start" },
        message: { paddingBlock: 6 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40 },
        indicator: { height: 2, borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: 40, paddingInline: 12, fontSize: "0.8125rem", fontWeight: 500, textTransform: "none" },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: { fontSize: "0.8125rem" },
        separator: ({ theme }) => ({ color: theme.vars.palette.text.disabled, marginInline: 4 }),
      },
    },
    MuiLink: { defaultProps: { underline: "none" } },
    MuiAvatar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.action.selected,
          color: theme.vars.palette.primary.main,
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
        }),
      },
    },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: "rgba(22, 28, 27, 0.45)", "&.MuiBackdrop-invisible": { backgroundColor: "transparent" } } },
    },
    MuiDivider: { styleOverrides: { root: ({ theme }) => ({ borderColor: theme.vars.palette.divider }) } },
    MuiCheckbox: { defaultProps: { size: "small" } },
    MuiSwitch: { defaultProps: { size: "small" } },
    MuiPagination: { defaultProps: { shape: "rounded", size: "small" } },
  },
});
