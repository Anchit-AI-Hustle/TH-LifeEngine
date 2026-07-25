import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "./responsive.css";
import { AppVersionProvider } from "@/components/providers/AppVersionProvider";

const PORTFOLIO_ASSETS = "https://anchit-tandon.com/assets";

export const metadata: Metadata = {
  title: "TH+ LifeEngine",
  description: "Personalized health booster",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#111111",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Shared portfolio navigation + project-level SkillTree / prompt library. */}
        <link rel="stylesheet" href={`${PORTFOLIO_ASSETS}/app-skill-map.css`} />
        <link rel="stylesheet" href={`${PORTFOLIO_ASSETS}/project-playbooks.css`} />
      </head>
      <body className="auto-scale">
        <AppVersionProvider>{children}</AppVersionProvider>
        <Script src={`${PORTFOLIO_ASSETS}/app-skill-map.js`} strategy="afterInteractive" />
        <Script src={`${PORTFOLIO_ASSETS}/project-playbooks.js`} strategy="afterInteractive" />
      </body>
    </html>
  );
}
