import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";

type Illustration = "inbox" | "search" | "table" | "map" | "shield";

/** Quiet empty state: token-coloured illustration, title, hint and a next action. */
export function EmptyState({
  illustration = "inbox",
  icon,
  title,
  description,
  action,
  compact = false,
  sx,
}: {
  illustration?: Illustration;
  /** Overrides the built-in illustration with any node (e.g. an MUI icon). */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      role="status"
      sx={[
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: compact ? 2 : 3,
          px: compact ? 4 : 6,
          py: compact ? 8 : 14,
          color: "text.disabled",
          "& > svg": { width: compact ? 48 : 80, height: compact ? 48 : 80 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {icon ?? <EmptyIllustration kind={illustration} />}
      <Box sx={{ maxWidth: 360 }}>
        <Typography variant="h4" component="p" sx={{ color: "text.primary" }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>{action}</Box> : null}
    </Box>
  );
}

function EmptyIllustration({ kind }: { kind: Illustration }) {
  const common = {
    viewBox: "0 0 96 96",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const wash = { fill: "var(--nv-palette-background-sunken)", stroke: "none" };
  const accent = { stroke: "var(--nv-palette-primary-main)" };
  switch (kind) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="48" cy="48" r="34" {...wash} />
          <circle cx="44" cy="44" r="16" />
          <path d="m56 56 12 12" />
          <path d="M38 44h12M44 38v12" {...accent} />
        </svg>
      );
    case "table":
      return (
        <svg {...common}>
          <circle cx="48" cy="48" r="34" {...wash} />
          <rect x="24" y="30" width="48" height="36" rx="4" />
          <path d="M24 42h48M40 42v24M56 42v24" />
          <path d="M30 36h8" {...accent} />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <circle cx="48" cy="48" r="34" {...wash} />
          <path d="M26 36l14-6 16 6 14-6v30l-14 6-16-6-14 6z" />
          <path d="M40 30v30M56 36v30" />
          <circle cx="48" cy="46" r="4" fill="var(--nv-palette-primary-main)" {...accent} />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <circle cx="48" cy="48" r="34" {...wash} />
          <path d="M48 26l18 7v14c0 12-8 21-18 25-10-4-18-13-18-25V33z" />
          <path d="m40 48 6 6 10-12" {...accent} />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="48" cy="48" r="34" {...wash} />
          <path d="M26 54V38a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v16" />
          <path d="M26 54h14l3 6h10l3-6h14v10a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4z" />
          <path d="M40 44h16" {...accent} />
        </svg>
      );
  }
}
