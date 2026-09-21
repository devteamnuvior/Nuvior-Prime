import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AppRoleName } from "@/domain/auth/permissions";
import { writeAuditEvent } from "@/lib/audit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: AppRoleName;
      status: "ACTIVE" | "DISABLED";
      provinces: string[];
      territories: string[];
    };
  }

  interface User {
    role: AppRoleName;
    status: "ACTIVE" | "DISABLED";
    provinces: string[];
    territories: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRoleName;
    status?: "ACTIVE" | "DISABLED";
    provinces?: string[];
    territories?: string[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Local development",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        if (user.status !== "ACTIVE") return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) {
          await writeAuditEvent({
            actor: null,
            action: "auth.login_failed",
            resourceType: "User",
            resourceId: user.id,
            metadata: { email },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await writeAuditEvent({
          actor: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            status: user.status,
            provinces: user.provinces,
            territories: user.territories,
          },
          action: "auth.login",
          resourceType: "User",
          resourceId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role,
          status: user.status,
          provinces: user.provinces,
          territories: user.territories,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.provinces = user.provinces;
        token.territories = user.territories;
      }
      // Re-check disabled status periodically via DB when id present
      if (token.id && !user) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { status: true, role: true, provinces: true, territories: true, displayName: true, email: true },
        });
        if (!fresh || fresh.status !== "ACTIVE") {
          token.status = "DISABLED";
        } else {
          token.status = fresh.status;
          token.role = fresh.role;
          token.provinces = fresh.provinces;
          token.territories = fresh.territories;
          token.name = fresh.displayName;
          token.email = fresh.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.status === "DISABLED") {
        session.user = {
          ...session.user,
          id: "",
          email: "",
          name: "",
          role: "REP",
          status: "DISABLED",
          provinces: [],
          territories: [],
        };
        return session;
      }
      session.user = {
        ...session.user,
        id: String(token.id ?? ""),
        email: String(token.email ?? ""),
        name: String(token.name ?? ""),
        role: (token.role as AppRoleName) ?? "REP",
        status: (token.status as "ACTIVE" | "DISABLED") ?? "ACTIVE",
        provinces: token.provinces ?? [],
        territories: token.territories ?? [],
      };
      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});
