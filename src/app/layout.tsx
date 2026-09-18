import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { publicEnv } from "@/lib/config/env";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Solink — The complete solar-energy ecosystem", template: "%s · Solink" },
  description: "Solink connects homeowners, solar products, installers, maintenance providers, system data and AI into one solar-energy platform for Kuwait and the GCC. Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize.",
  applicationName: "Solink",
  metadataBase: new URL(publicEnv.appUrl),
  openGraph: { title: "Solink", description: "One connected solar-energy ecosystem for Kuwait and the GCC.", siteName: "Solink", type: "website" },
};

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f4f6f9" }, { media: "(prefers-color-scheme: dark)", color: "#0a1120" }], width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Applies the stored theme before first paint. Key/format must match useLocalStore("theme"). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=JSON.parse(localStorage.getItem('solink:theme'));if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}` }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
