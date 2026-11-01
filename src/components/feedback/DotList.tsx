import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

/** Quiet bulleted list with a 4px primary dot — route reasons, brief snapshots, intel "why" lines. */
export function DotList({
  items,
  dot = "primary.main",
  gap = 1.5,
  sx,
}: {
  items: React.ReactNode[];
  dot?: string;
  gap?: number;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box component="ul" sx={[{ m: 0, p: 0, listStyle: "none", display: "grid", gap }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {items.map((item, i) => (
        <Box component="li" key={typeof item === "string" ? item : i} sx={{ display: "flex", gap: 2, minWidth: 0 }}>
          <Box component="span" aria-hidden sx={{ mt: "8px", width: 4, height: 4, flexShrink: 0, borderRadius: "50%", bgcolor: dot }} />
          <Box component="span" sx={{ minWidth: 0 }}>
            {item}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/** Plain list without markers (relationship facts, exclusions). */
export function PlainList({ children, gap = 1, sx }: { children: React.ReactNode; gap?: number; sx?: SxProps<Theme> }) {
  return (
    <Box component="ul" sx={[{ m: 0, p: 0, listStyle: "none", display: "grid", gap }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  );
}
