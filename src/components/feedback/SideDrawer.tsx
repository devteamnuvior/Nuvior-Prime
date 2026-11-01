"use client";

import Box from "@mui/material/Box";
import Drawer, { type DrawerProps } from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseOutlined from "@mui/icons-material/CloseOutlined";

/** Right-side panel for create/edit flows: header, scrollable body, sticky footer. Bottom sheet on phones. */
export function SideDrawer({
  open,
  onClose,
  title,
  description,
  footer,
  width = 480,
  children,
  titleId = "nv-side-drawer-title",
  ...props
}: Omit<DrawerProps, "open" | "onClose" | "title"> & {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  titleId?: string;
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: width },
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            borderLeft: 1,
            borderColor: "divider",
          },
        },
      }}
      {...props}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 3, px: 5, pt: 5, pb: 4, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography id={titleId} variant="h3" component="h2">
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
              {description}
            </Typography>
          ) : null}
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ mt: -0.5, mr: -1 }}>
          <CloseOutlined fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: 5, py: 5 }}>
        {children}
      </Box>
      {footer ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, px: 5, py: 4, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
          {footer}
        </Box>
      ) : null}
    </Drawer>
  );
}
