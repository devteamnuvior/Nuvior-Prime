"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { adminCreateUserAction } from "@/app/actions";
import type { AppRoleName } from "@/domain/auth/permissions";
import type { UserActionResult } from "@/domain/auth/userAdmin";
import { UserAvatar } from "./UserAvatar";
import {
  PROVINCE_OPTIONS,
  ROLE_META,
  ROLE_ORDER,
  generatePassword,
  passwordStrength,
} from "./userPresentation";

type FormState = {
  displayName: string;
  email: string;
  role: AppRoleName;
  allProvinces: boolean;
  provinces: string[];
  password: string;
};

const INITIAL: FormState = {
  displayName: "",
  email: "",
  role: "REP",
  allProvinces: false,
  provinces: ["ON"],
  password: "",
};

export function CreateUserDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: UserActionResult) => void;
}) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, start] = useTransition();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  // Reset + focus + lock body scroll while open; close on Escape.
  useEffect(() => {
    if (!open) return;
    setForm(INITIAL);
    setErrors({});
    setFormError(null);
    setShowPassword(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const strength = passwordStrength(form.password);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  function toggleProvince(code: string) {
    setForm((f) => ({
      ...f,
      allProvinces: false,
      provinces: f.provinces.includes(code)
        ? f.provinces.filter((c) => c !== code)
        : [...f.provinces, code],
    }));
    setErrors((e) => {
      const next = { ...e };
      delete next.provinces;
      return next;
    });
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (form.displayName.trim().length < 2) e.displayName = "Name must be at least 2 characters";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (!form.allProvinces && form.provinces.length === 0) e.provinces = "Pick at least one province";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    return e;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }
    setFormError(null);
    start(async () => {
      const r = await adminCreateUserAction({
        email: form.email,
        displayName: form.displayName,
        role: form.role,
        provinces: form.allProvinces ? ["*"] : form.provinces,
        password: form.password,
      });
      if (r.ok) {
        onCreated(r);
        onClose();
        return;
      }
      if (r.fieldErrors) setErrors(r.fieldErrors);
      else setFormError(r.message);
    });
  }

  const previewName = form.displayName.trim() || "New user";
  const previewEmail = form.email.trim() || "name@nuvior.ca";

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="nv-fade-in absolute inset-0 bg-inkwell/35 backdrop-blur-[2px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="nv-side-drawer-in absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-2xl border border-rule bg-paper shadow-float md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-full md:max-w-md md:rounded-none md:border-y-0 md:border-r-0"
      >
        <header className="flex items-start justify-between gap-4 border-b border-rule px-6 pt-5 pb-4">
          <div>
            <h2 id={titleId} className="text-[15px] font-semibold tracking-tight text-ink">
              Add user
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Creates a local account. They can sign in right away with the password you set.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="-mr-2 flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <form id="create-user-form" onSubmit={submit} className="nv-scroll flex-1 overflow-y-auto px-6 py-5">
          {/* Live preview */}
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rule bg-panel p-3 shadow-card">
            <UserAvatar name={previewName} email={previewEmail} size="lg" />
            <div className="min-w-0">
              <div className="truncate font-semibold text-ink">{previewName}</div>
              <div className="truncate font-mono text-xs text-muted">{previewEmail}</div>
              <span
                className={`mt-1.5 inline-flex rounded-full border px-2 py-px text-[11px] font-medium ${ROLE_META[form.role].pillClass}`}
              >
                {ROLE_META[form.role].label}
              </span>
            </div>
          </div>

          <div className="space-y-5">
            <Field label="Full name" error={errors.displayName} htmlFor="cu-name">
              <input
                id="cu-name"
                ref={firstFieldRef}
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
                placeholder="e.g. Maya Chen"
                autoComplete="off"
                className={inputClass(!!errors.displayName)}
              />
            </Field>

            <Field label="Work email" error={errors.email} htmlFor="cu-email">
              <input
                id="cu-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="name@nuvior.ca"
                autoComplete="off"
                inputMode="email"
                className={`${inputClass(!!errors.email)} font-mono`}
              />
            </Field>

            <fieldset>
              <legend className="mb-2 text-xs font-medium text-ink">Role</legend>
              <div className="grid gap-2">
                {ROLE_ORDER.slice().reverse().map((r) => {
                  const meta = ROLE_META[r];
                  const selected = form.role === r;
                  return (
                    <label
                      key={r}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selected
                          ? "border-accent bg-accent-tint/60 ring-1 ring-accent/40"
                          : "border-rule bg-panel hover:border-faint"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={selected}
                        onChange={() => set("role", r)}
                        className="mt-0.5 accent-[var(--accent)]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{meta.label}</span>
                        <span className="block text-xs leading-snug text-muted">{meta.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <div className="mb-2 flex items-center justify-between">
                <legend className="text-xs font-medium text-ink">Territory</legend>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={form.allProvinces}
                    onChange={(e) => {
                      set("allProvinces", e.target.checked);
                      setErrors((er) => {
                        const n = { ...er };
                        delete n.provinces;
                        return n;
                      });
                    }}
                    className="accent-[var(--accent)]"
                  />
                  All provinces
                </label>
              </div>
              <div
                className={`flex flex-wrap gap-1.5 rounded-lg border p-2 transition-opacity ${
                  errors.provinces ? "border-danger/50" : "border-rule"
                } ${form.allProvinces ? "opacity-40" : ""}`}
              >
                {PROVINCE_OPTIONS.map((p) => {
                  const on = !form.allProvinces && form.provinces.includes(p.code);
                  return (
                    <button
                      key={p.code}
                      type="button"
                      disabled={form.allProvinces}
                      aria-pressed={on}
                      title={p.name}
                      onClick={() => toggleProvince(p.code)}
                      className={`rounded-md border px-2 py-1 font-mono text-[0.68rem] tracking-wider transition-colors disabled:cursor-not-allowed ${
                        on
                          ? "border-inkwell bg-inkwell text-paper"
                          : "border-rule bg-paper text-muted hover:border-faint hover:text-ink"
                      }`}
                    >
                      {p.code}
                    </button>
                  );
                })}
              </div>
              {errors.provinces ? (
                <p className="mt-1.5 text-xs text-danger">{errors.provinces}</p>
              ) : (
                <p className="mt-1.5 text-xs text-faint">
                  {form.allProvinces
                    ? "Can operate anywhere in Canada."
                    : form.provinces.length
                      ? `${form.provinces.length} selected · ${form.provinces.join(", ")}`
                      : "Pick the provinces this user may work in."}
                </p>
              )}
            </fieldset>

            <Field label="Temporary password" error={errors.password} htmlFor="cu-password">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="cu-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className={`${inputClass(!!errors.password)} pr-10 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-faint hover:text-ink"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    set("password", generatePassword());
                    setShowPassword(true);
                  }}
                  className="shrink-0 rounded-md border border-rule bg-panel px-3 text-xs font-medium text-ink transition-colors hover:border-faint hover:bg-canvas"
                >
                  Generate
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1" aria-hidden>
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        strength.score >= i
                          ? strength.score <= 1
                            ? "bg-danger"
                            : strength.score === 2
                              ? "bg-signal"
                              : "bg-accent"
                          : "bg-rule"
                      }`}
                    />
                  ))}
                </div>
                <span className="w-16 text-right font-mono text-[0.65rem] text-muted">{strength.label}</span>
              </div>
            </Field>
          </div>

          {formError && (
            <p role="alert" className="mt-5 rounded-lg border border-danger/30 bg-danger-tint px-3 py-2 text-xs text-danger">
              {formError}
            </p>
          )}
        </form>

        <footer className="flex items-center justify-end gap-2 border-t border-rule bg-panel px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-9 rounded-md border border-rule px-4 text-sm font-medium text-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-user-form"
            disabled={pending}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-inkwell px-4 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:opacity-60"
          >
            {pending && <Spinner />}
            {pending ? "Creating…" : "Create user"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return `h-10 w-full rounded-md border bg-panel px-3 text-sm text-ink placeholder:text-faint transition-colors focus:border-accent focus:outline-none ${
    invalid ? "border-danger/60" : "border-rule hover:border-faint"
  }`;
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-ink">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1" />
      <path d="M6.1 6.1C3.6 7.9 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.8-.8" />
    </svg>
  );
}
