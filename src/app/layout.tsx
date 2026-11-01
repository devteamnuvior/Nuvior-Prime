import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { Providers } from "@/components/Providers";

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-loaded",
});

/* Only the login page title is set in the serif; every other piece of UI is Inter. */
const serif = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif-loaded",
});

export const metadata: Metadata = {
  title: "NUVIOR Prime",
  description: "Daily field-sales territory planning for NUVIOR representatives",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <NextTopLoader color="var(--nv-palette-primary-main)" height={2} shadow={false} showSpinner={false} speed={200} crawlSpeed={150} zIndex={1400} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
