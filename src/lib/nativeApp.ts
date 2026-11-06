/**
 * The iOS app (Capacitor) appends this token to the WebView's user agent
 * (`appendUserAgent` in capacitor.config.ts), so the server can tell an app
 * request from a browser one before any JavaScript runs.
 */
export const NATIVE_APP_UA_TOKEN = "NuviorPrimeApp";

export function isNativeAppUserAgent(userAgent: string | null | undefined): boolean {
  return !!userAgent && userAgent.includes(NATIVE_APP_UA_TOKEN);
}

/**
 * sessionStorage key holding when the splash last played. iOS keeps the app
 * WebView's sessionStorage across launches, so "seen" means "played in the
 * last SPLASH_REPEAT_AFTER_MS" — enough to skip it on the reload right after
 * sign-in, short enough that every real launch gets it.
 */
export const SPLASH_SEEN_KEY = "nv.splash.playedAt";
export const SPLASH_REPEAT_AFTER_MS = 60_000;

export function splashRecentlyPlayed(playedAt: string | null, now: number): boolean {
  const t = Number(playedAt);
  return Number.isFinite(t) && t > 0 && now - t >= 0 && now - t < SPLASH_REPEAT_AFTER_MS;
}

/** Inline in <head>: a reload right after the splash played skips it before first paint. */
export const SPLASH_SEEN_SCRIPT = `try{var t=Number(sessionStorage.getItem(${JSON.stringify(SPLASH_SEEN_KEY)})),d=Date.now()-t;if(t>0&&d>=0&&d<${SPLASH_REPEAT_AFTER_MS})document.documentElement.setAttribute("data-splash-seen","")}catch(e){}`;

/**
 * Inline at the end of <body>, once the web splash is in the page: hide the
 * native launch screen (same gradient) so the hand-over is seamless. If the
 * page never loads, the plugin's launchShowDuration hides it anyway.
 */
export const SPLASH_HANDOFF_SCRIPT = `try{var p=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.SplashScreen;if(p)p.hide({fadeOutDuration:0})}catch(e){}`;
