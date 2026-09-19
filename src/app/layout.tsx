import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { publicEnv } from "@/lib/config/env";

/**
 * One family carries both scripts, so Solink reads the same in English and
 * Arabic without a second, fashionable display face bolted on. Weight and
 * scale do the work that a pairing usually does.
 */
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Solink — The complete solar-energy ecosystem", template: "%s · Solink" },
  description: "Solink connects homeowners, solar products, installers, maintenance providers, system data and AI into one solar-energy platform for Kuwait and the GCC. Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize.",
  applicationName: "Solink",
  metadataBase: new URL(publicEnv.appUrl),
  openGraph: { title: "Solink", description: "One connected solar-energy ecosystem for Kuwait and the GCC.", siteName: "Solink", type: "website" },
};

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6f1e8" }, { media: "(prefers-color-scheme: dark)", color: "#12102a" }], width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plexArabic.variable} ${plexMono.variable} h-full antialiased`}>
      <head>
        {/* Applies the stored theme before first paint. Key/format must match useLocalStore("theme"). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=JSON.parse(localStorage.getItem('solink:theme'));if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}` }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
