"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

const DEV_USERS = [
  { email: "on.rep@nuvior.local", label: "Ontario Rep", password: "DevPass123!" },
  { email: "ab.rep@nuvior.local", label: "Alberta Rep", password: "DevPass123!" },
  { email: "on.manager@nuvior.local", label: "Ontario Manager", password: "DevPass123!" },
  { email: "admin@nuvior.local", label: "National Admin", password: "DevPass123!" },
];

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [email, setEmail] = useState(DEV_USERS[0]!.email);
  const [password, setPassword] = useState(DEV_USERS[0]!.password);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setPending(false);
    if (res?.error) {
      setError("Sign-in failed — check email/password or user status.");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-inkwell text-xl text-paper"
          style={{ fontFamily: "var(--brand-serif)", fontStyle: "italic" }}
        >
          N
        </span>
        <div>
          <div className="text-sm font-semibold tracking-[0.18em] text-ink uppercase">
            Nuvior <span className="text-accent">Prime</span>
          </div>
          <div className="text-xs text-muted">Territory planning for field sales</div>
        </div>
      </div>

      <div className="rounded-xl border border-rule bg-panel p-7 shadow-card">
        <h1 className="text-lg font-semibold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-[13px] text-muted">Use your NUVIOR credentials to continue.</p>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink">Email</span>
            <input
              className="h-11 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink">Password</span>
            <input
              type="password"
              className="h-11 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-danger-tint px-3.5 py-2.5 text-[13px] text-danger">{error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-lg bg-accent text-[13px] font-semibold tracking-[0.08em] text-white uppercase transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">
          Development accounts
        </summary>
        <div className="mt-2 space-y-1.5">
          {DEV_USERS.map((u) => (
            <button
              key={u.email}
              type="button"
              className="block w-full rounded-lg border border-rule bg-panel px-3.5 py-2.5 text-left text-[13px] hover:bg-canvas"
              onClick={() => {
                setEmail(u.email);
                setPassword(u.password);
              }}
            >
              <span className="font-medium text-ink">{u.label}</span>
              <span className="ml-2 text-xs text-muted">{u.email}</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
