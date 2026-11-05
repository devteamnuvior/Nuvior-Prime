"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { ThemeRegistry } from "@/theme/ThemeRegistry";

/** `session` comes from the server render, so useSession() has it at once and skips the mount-time /api/auth/session fetch. */
export function Providers({ session, children }: { session: Session | null; children: React.ReactNode }) {
  return (
    <SessionProvider session={session}>
      <ThemeRegistry>{children}</ThemeRegistry>
    </SessionProvider>
  );
}
