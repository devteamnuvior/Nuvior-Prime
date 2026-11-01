"use client";

import Box from "@mui/material/Box";
import { ShellProvider, type ShellUser } from "./shell-context";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { NavGroup } from "./nav";

export function DashboardShell({
  groups,
  user,
  initialCollapsed,
  signOutAction,
  today,
  children,
}: {
  groups: NavGroup[];
  user: ShellUser | null;
  initialCollapsed: boolean;
  signOutAction: () => Promise<void>;
  today: string;
  children: React.ReactNode;
}) {
  return (
    <ShellProvider initialCollapsed={initialCollapsed} user={user}>
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar groups={groups} />
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: "100vh" }}>
          <Header groups={groups} signOutAction={signOutAction} today={today} />
          <Box component="main" id="main" sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </ShellProvider>
  );
}
