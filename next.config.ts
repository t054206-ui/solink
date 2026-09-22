import type { NextConfig } from "next";

/**
 * Response headers for every route. No Content-Security-Policy yet: the
 * vendored three.js intro, Supabase, Google Maps and the inline theme
 * bootstrap would each need an allow-list and a test pass first (frontend
 * audit, 2026-09-22). The four below are safe defaults with no behaviour
 * change.
 */
/**
 * Content-Security-Policy (security audit, 2026-09-22). Tested in report-only
 * mode against the film, sign-in, product pages, the designer canvas, the
 * profile map, the AI chat and the manufacturer pages with no violation,
 * then enforced. Sources: Supabase (REST, auth, storage, realtime), Google
 * Maps and its tiles, Google Fonts, the manufacturers' image hosts (any
 * https image, since renders come from five company domains), the vendored
 * three.js film and Next's inline runtime. If a page ever breaks, the
 * browser console names the blocked source; add it here, do not drop the
 * header.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://*.googleapis.com",
  "frame-src 'self' https://www.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
