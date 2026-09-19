import type { Metadata, Viewport } from "next";
import { Fira_Sans, Fira_Code, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { publicEnv } from "@/lib/config/env";

/**
 * "Dashboard Data" pairing: Fira Sans for the interface, Fira Code for figures.
 * Fira Sans stays legible at the 12-14px this product actually runs at, and Fira
 * Code gives tabular numerals so columns of kWh line up. IBM Plex Sans Arabic
 * sits in the same stack so Arabic is ready without a second design pass.
 */
const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
const firaCode = Fira_Code({
  variable: "--font-fira-code",
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
  title: { default: "Solink — The complete solar-energy ecosystem", template: "%s · Solink" },
  description: "Solink connects homeowners, solar products, installers, maintenance providers, system data and AI into one solar-energy platform for Kuwait and the GCC. Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize.",
  applicationName: "Solink",
  metadataBase: new URL(publicEnv.appUrl),
  openGraph: { title: "Solink", description: "One connected solar-energy ecosystem for Kuwait and the GCC.", siteName: "Solink", type: "website" },
};

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f8fafc" }, { media: "(prefers-color-scheme: dark)", color: "#0b1220" }], width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${firaSans.variable} ${firaCode.variable} ${plexArabic.variable} h-full antialiased`}>
      <head>
        {/* Applies the stored theme before first paint. Key/format must match useLocalStore("theme"). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=JSON.parse(localStorage.getItem('solink:theme'));if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}` }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
