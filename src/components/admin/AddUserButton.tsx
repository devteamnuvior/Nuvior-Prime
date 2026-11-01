"use client";

import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Button, { type ButtonProps } from "@mui/material/Button";
import AddOutlined from "@mui/icons-material/AddOutlined";

/** One light sweep across the button when it is hovered. */
const sweep = keyframes`
  from { transform: translateX(-120%) skewX(-18deg); }
  to { transform: translateX(220%) skewX(-18deg); }
`;

/**
 * Primary call-to-action for the Team Members page: gradient fill, tinted shadow, a lift on
 * hover with a light sweep, and the plus glyph turning a quarter turn. All motion is skipped
 * under `prefers-reduced-motion`.
 */
export function AddUserButton({ children = "Add User", sx, ...props }: ButtonProps) {
  return (
    <Button
      variant="contained"
      disableElevation
      startIcon={<AddOutlined />}
      {...props}
      sx={[
        (t) => {
          const p = (t.vars ?? t).palette;
          return {
            position: "relative",
            overflow: "hidden",
            height: 40,
            px: 4.5,
            borderRadius: 999,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: p.primary.contrastText,
            backgroundImage: `linear-gradient(135deg, ${p.primary.light} -40%, ${p.primary.main} 45%, ${p.primary.dark} 120%)`,
            backgroundSize: "140% 140%",
            backgroundPosition: "0% 50%",
            boxShadow: `0 6px 16px -6px rgba(var(--nv-palette-primary-mainChannel) / 0.55), 0 1px 2px rgba(var(--nv-palette-primary-mainChannel) / 0.3)`,
            transition: t.transitions.create(["transform", "box-shadow", "background-position"], { duration: t.transitions.duration.standard }),
            "& .MuiButton-startIcon": {
              transition: t.transitions.create("transform", { duration: t.transitions.duration.standard }),
            },
            // Light sweep: hidden until hover, then animated once across the face.
            "&::after": {
              content: '""',
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "40%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
              transform: "translateX(-120%) skewX(-18deg)",
              pointerEvents: "none",
            },
            "&:hover": {
              backgroundPosition: "100% 50%",
              transform: "translateY(-2px)",
              boxShadow: `0 12px 24px -8px rgba(var(--nv-palette-primary-mainChannel) / 0.6), 0 2px 4px rgba(var(--nv-palette-primary-mainChannel) / 0.3)`,
              "& .MuiButton-startIcon": { transform: "rotate(90deg)" },
              "&::after": { animation: `${sweep} 700ms ${t.transitions.easing.easeOut} forwards` },
            },
            "&:active": {
              transform: "translateY(0) scale(0.98)",
              boxShadow: `0 4px 10px -6px rgba(var(--nv-palette-primary-mainChannel) / 0.5)`,
            },
            "&.Mui-focusVisible": {
              boxShadow: `0 0 0 3px ${p.action.focus}, 0 6px 16px -6px rgba(var(--nv-palette-primary-mainChannel) / 0.55)`,
            },
            "@media (prefers-reduced-motion: reduce)": {
              transition: "none",
              "&:hover": { transform: "none", "& .MuiButton-startIcon": { transform: "none" }, "&::after": { animation: "none" } },
            },
          };
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box component="span" sx={{ position: "relative", zIndex: 1 }}>
        {children}
      </Box>
    </Button>
  );
}
