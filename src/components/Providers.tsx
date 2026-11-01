"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeRegistry } from "@/theme/ThemeRegistry";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeRegistry>{children}</ThemeRegistry>
    </SessionProvider>
  );
}
