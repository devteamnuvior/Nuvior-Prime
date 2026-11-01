import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import { avatarHue, initialsOf } from "./userPresentation";

const SIZES = { sm: 32, md: 36, lg: 56 } as const;

/** Initials avatar with a deterministic muted hue and an optional status dot. */
export function UserAvatar({
  name,
  email,
  size = "md",
  status,
}: {
  name: string;
  email: string;
  size?: keyof typeof SIZES;
  status?: "ACTIVE" | "DISABLED";
}) {
  const hue = avatarHue(email || name);
  const px = SIZES[size];
  const dimmed = status === "DISABLED";
  const avatar = (
    <Avatar
      aria-hidden
      sx={{
        width: px,
        height: px,
        fontSize: px * 0.33,
        bgcolor: `hsl(${hue} 30% 90%)`,
        color: `hsl(${hue} 45% 28%)`,
        opacity: dimmed ? 0.5 : 1,
        filter: dimmed ? "grayscale(1)" : "none",
        boxShadow: "0 0 0 2px var(--nv-palette-background-paper)",
      }}
    >
      {initialsOf(name, email)}
    </Avatar>
  );
  if (!status) return avatar;
  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      variant="dot"
      aria-hidden
      sx={{
        "& .MuiBadge-badge": {
          bgcolor: status === "ACTIVE" ? "success.main" : "text.disabled",
          boxShadow: "0 0 0 2px var(--nv-palette-background-paper)",
          width: 10,
          height: 10,
          borderRadius: "50%",
        },
      }}
    >
      {avatar}
    </Badge>
  );
}
