"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const DEV_USERS = [
  { email: "on.rep@nuvior.local", label: "Ontario Rep", password: "DevPass123!" },
  { email: "ab.rep@nuvior.local", label: "Alberta Rep", password: "DevPass123!" },
  { email: "on.manager@nuvior.local", label: "Ontario Manager", password: "DevPass123!" },
  { email: "admin@nuvior.local", label: "National Admin", password: "DevPass123!" },
];

const SHOW_DEV_ACCOUNTS = process.env.NODE_ENV !== "production";
const REMEMBER_KEY = "nuvior.login.email";

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [email, setEmail] = useState(SHOW_DEV_ACCOUNTS ? DEV_USERS[0]!.email : "");
  const [password, setPassword] = useState(SHOW_DEV_ACCOUNTS ? DEV_USERS[0]!.password : "");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Restore a remembered email (client only, after hydration).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) setEmail(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

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
    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, email);
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* storage unavailable */
    }
    window.location.href = callbackUrl;
  }

  return (
    <div>
      <h1 className="nv-login__title nv-rise" style={{ "--i": 0 } as React.CSSProperties}>
        Welcome <em>back.</em>
      </h1>
      <p className="nv-login__lede nv-rise" style={{ "--i": 1 } as React.CSSProperties}>
        Sign in with your NUVIOR credentials to open today&rsquo;s route and clinic intelligence.
      </p>

      <form onSubmit={onSubmit} noValidate>
        <div className="nv-fieldset nv-rise" style={{ "--i": 2 } as React.CSSProperties}>
          <label className="nv-field">
            <span className="nv-field__label">Email</span>
            <input
              className="nv-field__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="you@nuvior.ca"
              required
            />
          </label>
          <label className="nv-field">
            <span className="nv-field__label">Password</span>
            <input
              className="nv-field__input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Your password"
              required
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              className="nv-field__eye"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </label>
        </div>

        <div className="nv-login__row nv-rise" style={{ "--i": 3 } as React.CSSProperties}>
          <label className="nv-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="nv-check__box" aria-hidden="true">
              <svg viewBox="0 0 12 12">
                <path d="M2 6.2 L4.8 9 L10 3.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Remember me
          </label>
          <button type="button" className="nv-link" onClick={() => setShowHelp((v) => !v)}>
            Forgot password?
          </button>
        </div>

        {showHelp && (
          <p className="nv-login__hint" role="status">
            Passwords are managed by your NUVIOR administrator. Ask your regional manager to
            reset it, then sign in with the new password.
          </p>
        )}

        {error && (
          <p className="nv-login__error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="nv-btn nv-rise"
          style={{ "--i": 4 } as React.CSSProperties}
        >
          <span className="nv-btn__inner">
            {pending ? (
              <>
                <span className="nv-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <svg className="nv-btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </span>
        </button>
      </form>

      {SHOW_DEV_ACCOUNTS && (
        <details className="nv-dev nv-rise" style={{ "--i": 5 } as React.CSSProperties}>
          <summary>
            <svg className="nv-dev__chev" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2.5 4.5 L6 8 L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Development accounts
          </summary>
          <div className="nv-dev__grid">
            {DEV_USERS.map((u, i) => (
              <button
                key={u.email}
                type="button"
                className={`nv-dev__user${email === u.email ? " nv-dev__user--active" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => {
                  setEmail(u.email);
                  setPassword(u.password);
                  setError(null);
                }}
              >
                <span className="nv-dev__name">{u.label}</span>
                <span className="nv-dev__email">{u.email}</span>
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 6.3A9.7 9.7 0 0 1 12 6.2c6 0 9.5 5.8 9.5 5.8a16 16 0 0 1-3.2 3.7M6.5 8.4A15.6 15.6 0 0 0 2.5 12s3.5 5.8 9.5 5.8c1.4 0 2.6-.3 3.7-.8M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
