"use client";

import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

/**
 * Equal-width segmented control (travel reach 30/45/60).
 * Selected cell is primary-filled; clicking the selected cell keeps it selected.
 */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  height = 40,
}: {
  value: T | null;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  height?: number;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      value={value}
      onChange={(_, next: T | null) => {
        if (next != null) onChange(next);
      }}
      aria-label={ariaLabel}
      sx={{
        bgcolor: "background.default",
        "& .MuiToggleButton-root": {
          minHeight: height,
          py: 0,
          borderColor: "divider",
          color: "text.secondary",
          fontWeight: 500,
          textTransform: "none",
          "&:hover": { bgcolor: "background.sunken", color: "text.primary" },
          "&.Mui-selected": {
            bgcolor: "primary.main",
            color: "primary.contrastText",
            borderColor: "primary.main",
            "&:hover": { bgcolor: "primary.dark" },
          },
        },
      }}
    >
      {options.map((o) => (
        <ToggleButton key={String(o.value)} value={o.value}>
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
