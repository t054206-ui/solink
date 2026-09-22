import type { NextConfig } from "next";

/**
 * Response headers for every route. No Content-Security-Policy yet: the
 * vendored three.js intro, Supabase, Google Maps and the inline theme
 * bootstrap would each need an allow-list and a test pass first (frontend
 * audit, 2026-09-22). The four below are safe defaults with no behaviour
 * change.
 */
const securityHeaders = [
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
