import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Lets two dev servers (e.g. ports 3100 and 3101) run side by side without
  // corrupting each other's webpack cache: NEXT_DIST_DIR=.next-3101 npx next dev -p 3101
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
