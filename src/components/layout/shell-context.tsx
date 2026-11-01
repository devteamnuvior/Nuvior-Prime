"use client";

import * as React from "react";

export type ShellUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  territory: string;
  initials: string;
};

type ShellContextValue = {
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (next: boolean) => void;
  user: ShellUser | null;
};

const ShellContext = React.createContext<ShellContextValue | null>(null);

export const SIDEBAR_COOKIE = "nv-sidebar";

export function ShellProvider({
  initialCollapsed,
  user,
  children,
}: {
  initialCollapsed: boolean;
  user: ShellUser | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsedState] = React.useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const setCollapsed = React.useCallback((next: boolean) => {
    setCollapsedState(next);
    // One-year cookie so the server renders the right width on the next request (no flash).
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const toggleCollapsed = React.useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  // Keyboard: "[" toggles the sidebar (ignored while typing in a field).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      toggleCollapsed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const value = React.useMemo(
    () => ({ collapsed, setCollapsed, toggleCollapsed, mobileOpen, setMobileOpen, user }),
    [collapsed, setCollapsed, toggleCollapsed, mobileOpen, user],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = React.useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within <ShellProvider>");
  return ctx;
}
