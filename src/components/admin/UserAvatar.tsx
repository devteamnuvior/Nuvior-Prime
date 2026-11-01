import { avatarColors, initialsOf } from "./userPresentation";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-14 w-14 text-lg",
} as const;

export function UserAvatar({
  name,
  email,
  size = "md",
  status,
  className = "",
}: {
  name: string;
  email: string;
  size?: keyof typeof SIZES;
  status?: "ACTIVE" | "DISABLED";
  className?: string;
}) {
  const { bg, fg } = avatarColors(email || name);
  const initials = initialsOf(name, email);
  const dimmed = status === "DISABLED";
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        aria-hidden
        className={`flex items-center justify-center rounded-full font-semibold tracking-wide select-none ring-2 ring-panel ${SIZES[size]} ${dimmed ? "opacity-50 grayscale" : ""}`}
        style={{ background: bg, color: fg, fontFamily: "var(--display)" }}
      >
        {initials}
      </span>
      {status && (
        <span
          aria-hidden
          className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-panel ${
            status === "ACTIVE" ? "bg-accent" : "bg-faint"
          }`}
        />
      )}
    </span>
  );
}
