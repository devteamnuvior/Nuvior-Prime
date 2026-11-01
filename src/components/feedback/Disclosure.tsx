"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import Typography from "@mui/material/Typography";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import type { SxProps, Theme } from "@mui/material/styles";

/**
 * Progressive-disclosure toggle: a quiet chevron label that reveals its children.
 * `inline` is a small text button (planner "Advanced", drawer "Details"); `row` is a
 * full-width list row with an optional trailing count (run diagnostics).
 * Content is unmounted while closed, as the v1 toggles were.
 */
export function Disclosure({
  label,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onToggle,
  variant = "inline",
  trailing,
  color = "text.secondary",
  sx,
  contentSx,
  id,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
  variant?: "inline" | "row";
  trailing?: React.ReactNode;
  /** Label colour token (e.g. "primary.main"). */
  color?: string;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  id?: string;
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolled;
  const autoId = React.useId();
  const panelId = id ?? `nv-disclosure-${autoId}`;
  const toggle = () => {
    const next = !open;
    if (controlledOpen === undefined) setUncontrolled(next);
    onToggle?.(next);
  };

  const chevron = (
    <ChevronRightOutlined
      aria-hidden
      sx={{
        fontSize: 16,
        transition: (t) => t.transitions.create("transform", { duration: t.transitions.duration.shortest }),
        transform: open ? "rotate(90deg)" : "none",
      }}
    />
  );

  return (
    <Box sx={sx}>
      {variant === "row" ? (
        <ButtonBase
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          sx={{
            width: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            px: 4,
            py: 3,
            textAlign: "left",
            color,
            typography: "caption",
            fontWeight: 500,
            "&:hover": { bgcolor: "background.sunken", color: "text.primary" },
          }}
        >
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
            {chevron}
            {label}
          </Box>
          {trailing ? (
            <Typography component="span" variant="caption" sx={{ color: "text.faint" }}>
              {trailing}
            </Typography>
          ) : null}
        </ButtonBase>
      ) : (
        <Button
          variant="text"
          size="small"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          startIcon={chevron}
          sx={{ px: 1, mx: -1, minHeight: 28, color, fontSize: "0.75rem", fontWeight: 500, "&:hover": { color: "text.primary" }, "& .MuiButton-startIcon": { mr: 1 } }}
        >
          {label}
        </Button>
      )}
      <Collapse in={open} unmountOnExit>
        <Box id={panelId} sx={contentSx}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
