"use client";

import * as React from "react";
import { useColorScheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import SettingsBrightnessOutlined from "@mui/icons-material/SettingsBrightnessOutlined";

const OPTIONS = [
  { value: "light", label: "Light", Icon: LightModeOutlined },
  { value: "dark", label: "Dark", Icon: DarkModeOutlined },
  { value: "system", label: "System", Icon: SettingsBrightnessOutlined },
] as const;

export function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[2];
  const CurrentIcon = current.Icon;

  return (
    <>
      <Tooltip title="Theme">
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Change theme"
          aria-haspopup="menu"
          aria-expanded={!!anchor}
          sx={{ color: "text.secondary" }}
        >
          <CurrentIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }}>
        {OPTIONS.map(({ value, label, Icon }) => (
          <MenuItem
            key={value}
            selected={mode === value}
            onClick={() => {
              setMode(value);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
