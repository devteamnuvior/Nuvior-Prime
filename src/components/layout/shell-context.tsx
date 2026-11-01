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
  mobileOpen: boolean;
  setMobileOpen: (next: boolean) => void;
  user: ShellUser | null;
};

const ShellContext = React.createContext<ShellContextValue | null>(null);

export function ShellProvider({ user, children }: { user: ShellUser | null; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const value = React.useMemo(() => ({ mobileOpen, setMobileOpen, user }), [mobileOpen, user]);

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = React.useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within <ShellProvider>");
  return ctx;
}
