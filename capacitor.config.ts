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
  ios: {
    contentInset: "automatic",
  },
};

export default config;
