import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS shell for the field reps. The app loads the live Nuvior Prime site
 * (so web deploys reach phones without a new build) and adds native
 * background location, which a browser tab can't do once the phone is locked.
 *
 * CAP_SERVER_URL picks the site at `npx cap sync` time:
 *   CAP_SERVER_URL=https://prime.example.com npx cap sync ios
 * Without it the shell points at the local dev server (Simulator only).
 */
const serverUrl = process.env.CAP_SERVER_URL || "http://localhost:3100";

const config: CapacitorConfig = {
  appId: "com.nuvior.prime",
  appName: "Nuvior Prime",
  // Shown only when the site can't be loaded; the real UI comes from serverUrl.
  webDir: "mobile/www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    errorPath: "index.html",
  },
  // Lets the server tell app requests apart (src/lib/nativeApp.ts): the app gets
  // the launch splash and no search button.
  appendUserAgent: "NuviorPrimeApp",
  // The WebView paints the strip under the status bar itself (contentInset
  // "automatic" keeps the page below it), so it carries the brand green: it
  // matches the launch splash and stays as a green status bar afterwards.
  backgroundColor: "#1f7366",
  ios: {
    contentInset: "automatic",
  },
  plugins: {
    // The native launch screen (green gradient, Splash.imageset) stays up until
    // the page's web splash takes over (SPLASH_HANDOFF_SCRIPT). If the site
    // can't load, it hides on its own after launchShowDuration.
    SplashScreen: {
      launchShowDuration: 8000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#1f7366",
      showSpinner: false,
    },
  },
};

export default config;
