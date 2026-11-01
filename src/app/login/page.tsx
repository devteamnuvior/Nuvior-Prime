import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import "./login.css";

/**
 * Hero photo: CN Tower above the clouds, Toronto — by mwangi gatheca on Unsplash
 * (Unsplash License, free to use). Served from the Unsplash CDN, so no file is
 * stored in the repo and next/image remote config is not needed.
 * https://unsplash.com/photos/cn-tower-skyline-in-toronto-qlKaN7eqay8
 */
const HERO_PHOTO =
  "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1800&q=80";

export default function LoginPage() {
  return (
    <main className="nv-login">
      <section className="nv-login__panel">
        <div className="nv-login__brand">
          <span className="nv-login__mark">N</span>
          <div>
            <div className="text-sm font-semibold tracking-[0.18em] text-ink uppercase">
              Nuvior <span className="text-accent">Prime</span>
            </div>
            <div className="text-xs text-muted">Territory planning for field sales</div>
          </div>
        </div>

        <div className="nv-login__body">
          <Suspense fallback={<p className="text-muted">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="nv-login__footer">
          <span>© {new Date().getFullYear()} NUVIOR · Canada</span>
          <span>Authorized representatives only</span>
        </div>
      </section>

      <aside className="nv-login__photo" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN image, intentionally unoptimized */}
        <img
          className="nv-login__img"
          src={HERO_PHOTO}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
        <div className="nv-login__photo-tint" />
      </aside>
    </main>
  );
}
