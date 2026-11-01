"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import BlockOutlined from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineOutlined from "@mui/icons-material/CheckCircleOutlineOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import ManageAccountsOutlined from "@mui/icons-material/ManageAccountsOutlined";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import type { AppRoleName } from "@/domain/auth/permissions";
import type { AdminUserRow } from "@/domain/auth/userAdmin";
import { EASE } from "@/theme/tokens";
import { IconTile, RingedAvatar, identityRise as rise, initialsOf } from "@/components/feedback/Identity";
import { ROLE_META, ROLE_ORDER, avatarHue } from "./userPresentation";

const REDUCED = "@media (prefers-reduced-motion: reduce)";

function Item({
  icon,
  tone,
  label,
  caption,
  disabled,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  tone?: "neutral" | "primary" | "danger" | "success";
  label: string;
  caption: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <MenuItem
      disabled={disabled}
      onClick={onClick}
      sx={{
        mx: 2,
        px: 2,
        py: 1.5,
        gap: 3,
        borderRadius: 2,
        alignItems: "center",
        color: danger ? "error.main" : "text.primary",
        transition: (t) => t.transitions.create("background-color", { duration: t.transitions.duration.short }),
        "&:hover, &.Mui-focusVisible": { bgcolor: danger ? "error.tint" : "action.hover" },
      }}
    >
      <IconTile tone={tone}>{icon}</IconTile>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: "inherit", lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
          {caption}
        </Typography>
      </Box>
    </MenuItem>
  );
}

/**
 * Row actions for a team member, in the same style as the account menu: identity band on top,
 * then labelled rows with icon tiles that rise in one after another.
 */
export function UserRowMenu({
  user,
  isSelf,
  busy,
  onChangeRole,
  onToggleStatus,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  busy: boolean;
  onChangeRole: (user: AdminUserRow, role: AppRoleName) => void;
  onToggleStatus: (user: AdminUserRow) => void;
}) {
  const router = useRouter();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);
  const active = user.status === "ACTIVE";
  const otherRoles = ROLE_ORDER.filter((r) => r !== user.role);

  return (
    <>
      <Tooltip title="Actions">
        <IconButton
          size="small"
          aria-label={`Actions for ${user.displayName}`}
          aria-haspopup="menu"
          aria-expanded={!!anchor}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ color: anchor ? "primary.main" : "text.secondary", bgcolor: anchor ? "primary.tint" : "transparent" }}
        >
          <MoreVertRounded fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: { sx: { width: 272, mt: 1, overflow: "hidden", borderRadius: 4, boxShadow: (t) => (t.vars ?? t).shadows[3] } },
          list: {
            sx: {
              p: 0,
              pb: 2,
              "& .MuiMenuItem-root": { animation: `${rise} 320ms ${EASE} both`, [REDUCED]: { animation: "none" } },
              ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`& .MuiMenuItem-root:nth-of-type(${i + 1})`, { animationDelay: `${60 + i * 45}ms` }])),
            },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            px: 4,
            pt: 3.5,
            pb: 3,
            mb: 2,
            borderBottom: 1,
            borderColor: "divider",
            background: "linear-gradient(180deg, var(--nv-palette-primary-tint) 0%, var(--nv-palette-background-paper) 100%)",
            animation: `${rise} 320ms ${EASE} both`,
            [REDUCED]: { animation: "none" },
          }}
        >
          <RingedAvatar initials={initialsOf(user.displayName)} size={32} dot={10} present={active} hue={avatarHue(user.email)} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {user.displayName}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary" }}>
              {ROLE_META[user.role].label} · {user.email}
            </Typography>
          </Box>
        </Box>

        <Item
          icon={<InsightsOutlined />}
          tone="primary"
          label="View performance"
          caption="KPIs, charts, targets and XP"
          onClick={() => {
            close();
            router.push(`/admin/users/${user.id}`);
          }}
        />
        {otherRoles.map((r) => (
          <Item
            key={r}
            icon={<ManageAccountsOutlined />}
            label={`Make ${ROLE_META[r].short}`}
            caption={isSelf ? "You cannot change your own role" : ROLE_META[r].description}
            disabled={isSelf || busy}
            onClick={() => {
              close();
              onChangeRole(user, r);
            }}
          />
        ))}
        <Divider sx={{ my: 2 }} />
        <Item
          icon={active ? <BlockOutlined /> : <CheckCircleOutlineOutlined />}
          tone={active ? "danger" : "success"}
          danger={active}
          label={active ? "Disable account" : "Enable account"}
          caption={isSelf ? "You cannot disable yourself" : active ? "Signs them out until enabled again" : "Lets them sign in again"}
          disabled={isSelf || busy}
          onClick={() => {
            close();
            onToggleStatus(user);
          }}
        />
      </Menu>
    </>
  );
}
