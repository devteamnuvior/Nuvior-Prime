"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import KeyboardReturnOutlined from "@mui/icons-material/KeyboardReturnOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { NAV_ICONS } from "./nav-icons";
import type { NavGroup, NavItem } from "./nav";

/** Quick navigation palette (⌘K / Ctrl+K). Searches the pages the user can access. */
export function CommandSearch({ groups }: { groups: NavGroup[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);

  const items = React.useMemo(() => {
    const flat: (NavItem & { group?: string })[] = [];
    for (const g of groups) {
      for (const i of g.items) {
        flat.push({ ...i, group: g.label });
        for (const c of i.children ?? []) flat.push({ ...c, group: i.label });
      }
    }
    const q = query.trim().toLowerCase();
    return q ? flat.filter((i) => i.label.toLowerCase().includes(q) || i.href.includes(q)) : flat;
  }, [groups, query]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  React.useEffect(() => setCursor(0), [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Tooltip title="Search pages (⌘K)">
        <ButtonBase
          onClick={() => setOpen(true)}
          aria-label="Search pages"
          sx={{
            height: 32,
            px: 2.5,
            gap: 2,
            borderRadius: 1.5,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            color: "text.secondary",
            width: { xs: 32, sm: 224 },
            justifyContent: "flex-start",
            "&:hover": { bgcolor: "background.sunken" },
          }}
        >
          <SearchOutlined sx={{ fontSize: 18 }} />
          <Typography variant="body2" sx={{ flex: 1, textAlign: "left", display: { xs: "none", sm: "block" } }}>
            Search…
          </Typography>
          <Box component="kbd" sx={{ display: { xs: "none", sm: "inline" }, px: 1, borderRadius: 0.5, border: 1, borderColor: "divider", bgcolor: "background.sunken", fontSize: "0.6875rem", fontFamily: "inherit", color: "text.disabled" }}>
            ⌘K
          </Box>
        </ButtonBase>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs" aria-labelledby="nv-command-title" sx={{ "& .MuiDialog-container": { alignItems: "flex-start", pt: "18vh" } }}>
        <Typography id="nv-command-title" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Search pages
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 3, borderBottom: 1, borderColor: "divider" }}>
          <SearchOutlined sx={{ fontSize: 18, color: "text.disabled" }} aria-hidden />
          <InputBase
            autoFocus
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(items.length - 1, c + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              } else if (e.key === "Enter" && items[cursor]) {
                e.preventDefault();
                go(items[cursor].href);
              }
            }}
            placeholder="Go to page…"
            inputProps={{
              role: "combobox",
              "aria-expanded": true,
              "aria-controls": "nv-command-list",
              "aria-activedescendant": items[cursor] ? `nv-cmd-${cursor}` : undefined,
            }}
            sx={{ height: 48, fontSize: "0.875rem" }}
          />
        </Box>
        <List id="nv-command-list" role="listbox" sx={{ maxHeight: 288, overflowY: "auto", p: 1 }}>
          {items.length === 0 && (
            <Typography variant="body2" sx={{ px: 3, py: 6, textAlign: "center", color: "text.secondary" }}>
              No pages match “{query}”.
            </Typography>
          )}
          {items.map((item, i) => {
            const Icon = NAV_ICONS[item.icon];
            const selected = i === cursor;
            return (
              <ListItemButton
                key={`${item.href}-${i}`}
                id={`nv-cmd-${i}`}
                role="option"
                aria-selected={selected}
                selected={selected}
                onMouseEnter={() => setCursor(i)}
                onClick={() => go(item.href)}
                sx={{ py: 1.5, "&.Mui-selected": { bgcolor: "action.hover", color: "text.primary" } }}
              >
                <ListItemIcon sx={{ color: "text.disabled" }}>
                  <Icon sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <>
                      {item.group ? <Box component="span" sx={{ color: "text.disabled" }}>{item.group} / </Box> : null}
                      {item.label}
                    </>
                  }
                  slotProps={{ primary: { sx: { fontSize: "0.8125rem" } } }}
                />
                {selected && <KeyboardReturnOutlined sx={{ fontSize: 14, color: "text.disabled" }} aria-hidden />}
              </ListItemButton>
            );
          })}
        </List>
        <IconButton sx={{ display: "none" }} aria-hidden tabIndex={-1} />
      </Dialog>
    </>
  );
}
