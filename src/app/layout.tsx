import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Archivo, JetBrains_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { publicEnv } from "@/lib/config/env";
import { LocaleProvider } from "@/lib/i18n/provider";
import { IntroHost } from "@/components/intro/IntroHost";

/**
 * "Studio" pairing. Archivo is the display and interface face: a grotesque with
 * enough weight to carry a hero at 88px and enough restraint to read at 13px in
 * a table. JetBrains Mono carries every figure and micro-label, so columns of
 * kWh line up and a measurement always looks like a measurement. IBM Plex Sans
 * Arabic takes over entirely when the page is in Arabic.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  variable: "--font-mono-jet",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Solink: the complete solar-energy ecosystem", template: "%s · Solink" },
  description: "Solink connects homeowners, solar products, installers, maintenance providers, system data and AI into one solar-energy platform for Kuwait and the GCC. Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize.",
  applicationName: "Solink",
  metadataBase: new URL(publicEnv.appUrl),
  openGraph: { title: "Solink", description: "One connected solar-energy ecosystem for Kuwait and the GCC.", siteName: "Solink", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Theme and locale are applied before hydration.
 *
 * The server already renders the common case — light, English, LTR — as real
 * attributes, so most visitors need this script to do nothing at all. It only
 * has work when someone has previously chosen dark or Arabic, and then getting
 * the direction right before paint matters more than the microsecond it costs.
 *
 * It goes through next/script with strategy="beforeInteractive" rather than a
 * bare <script> tag: React 19 hoists raw script elements out of the component
 * tree, which broke hydration here. Keys must match useLocalStore.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-theme="light"
      suppressHydrationWarning
      className={`${archivo.variable} ${jetbrains.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script src="/bootstrap.js" strategy="beforeInteractive" />
        {/* The curtain is server-rendered and hidden. bootstrap.js raises it
            before paint for a browser that has not seen the opening, so the
            landing page never flashes behind it, and the sequence takes it
            down as it leaves. An attribute on <html> is the whole mechanism:
            no DOM is written before hydration. */}
        <div className="intro-curtain" aria-hidden="true" />
        <LocaleProvider>
          <IntroHost />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
