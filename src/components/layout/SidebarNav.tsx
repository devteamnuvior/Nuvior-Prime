"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import { NAV_ICONS } from "./nav-icons";
import { isNavActive, type NavGroup, type NavItem } from "./nav";

export function SidebarNav({
  groups,
  collapsed,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <Box component="nav" aria-label="Main" className="nv-scroll" sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}>
      {groups.map((g, gi) => (
        <Box key={g.label ?? gi} sx={{ mt: gi > 0 ? 4 : 0 }}>
          {g.label ? (
            collapsed ? (
              <Divider sx={{ mx: 2, my: 2 }} />
            ) : (
              <Typography variant="eyebrow" sx={{ display: "block", px: 2.5, pb: 1, pt: 0.5 }}>
                {g.label}
              </Typography>
            )
          ) : null}
          <List disablePadding sx={{ display: "grid", gap: 0.5 }}>
            {g.items.map((item) => (
              <NavEntry key={item.href} item={item} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );
}

function NavEntry({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = NAV_ICONS[item.icon];
  const active = isNavActive(item, pathname);
  const hasChildren = !!item.children?.length;

  const button = (
    <ListItemButton
      component={Link}
      href={item.href}
      onClick={onNavigate}
      selected={active}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      sx={{
        px: collapsed ? 0 : 2.5,
        justifyContent: collapsed ? "center" : "flex-start",
        color: active ? "sidebar.activeFg" : "text.secondary",
        position: "relative",
        "&::before": active && !collapsed
          ? {
              content: '""',
              position: "absolute",
              left: 0,
              top: 8,
              bottom: 8,
              width: 2,
              borderRadius: 1,
              bgcolor: "primary.main",
            }
          : undefined,
        "&:hover": { color: "text.primary" },
      }}
    >
      <ListItemIcon sx={{ mr: collapsed ? 0 : 2.5, color: active ? "primary.main" : "text.disabled" }}>
        <Icon sx={{ fontSize: 20 }} />
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={item.label}
          slotProps={{ primary: { noWrap: true, sx: { fontSize: "0.8125rem", fontWeight: 500 } } }}
        />
      )}
      {!collapsed && hasChildren && (
        <ExpandMoreOutlined
          sx={{
            fontSize: 16,
            color: "text.disabled",
            transition: (t) => t.transitions.create("transform", { duration: t.transitions.duration.shortest }),
            transform: active ? "rotate(180deg)" : "none",
          }}
        />
      )}
    </ListItemButton>
  );

  return (
    <li style={{ listStyle: "none" }}>
      {collapsed ? (
        <Tooltip title={item.label} placement="right">
          {button}
        </Tooltip>
      ) : (
        button
      )}
      {hasChildren && (
        <Collapse in={active && !collapsed} timeout="auto" unmountOnExit>
          <List disablePadding sx={{ ml: 4, pl: 2, mt: 0.5, borderLeft: 1, borderColor: "divider", display: "grid", gap: 0.5 }}>
            {item.children!.map((child) => {
              const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
              return (
                <ListItemButton
                  key={child.href}
                  component={Link}
                  href={child.href}
                  onClick={onNavigate}
                  selected={childActive}
                  aria-current={childActive ? "page" : undefined}
                  sx={{
                    minHeight: 32,
                    py: 0.5,
                    px: 2.5,
                    color: childActive ? "sidebar.activeFg" : "text.secondary",
                    "&.Mui-selected": { bgcolor: "transparent", fontWeight: 500 },
                  }}
                >
                  <ListItemText primary={child.label} slotProps={{ primary: { sx: { fontSize: "0.8125rem", fontWeight: childActive ? 600 : 400 } } }} />
                </ListItemButton>
              );
            })}
          </List>
        </Collapse>
      )}
    </li>
  );
}
