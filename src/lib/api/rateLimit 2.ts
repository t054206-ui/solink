import "server-only";

/**
 * Best-effort rate limiting for routes that spend money (Claude, WeatherAPI,
 * Google) or do heavy work. A fixed window per key, kept in process memory.
 *
 * Honest scope: on Vercel each serverless instance has its own memory, so
 * this limits abuse per instance, not globally, and resets on cold start. It
 * stops a tight loop from one client and costs nothing; a hard, shared limit
 * needs a store (Upstash Redis or Vercel KV) and is recorded as an open
 * decision in docs/SECURITY-AUDIT-2026-09-22.md.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
let sweepAt = 0;

export interface RateLimit { limit: number; windowMs: number }

/** Sign-in gated routes limit per user; the key falls back to the client address when there is no user. */
export function rateLimitKey(req: Request, userId: string | null, route: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `${route}:${userId ?? `ip:${ip}`}`;
}

/** Returns null when allowed, or the 429 response to send. */
export function checkRateLimit(key: string, { limit, windowMs }: RateLimit): Response | null {
  const now = Date.now();
  if (now > sweepAt) { for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k); sweepAt = now + windowMs; }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return null; }
  b.count += 1;
  if (b.count <= limit) return null;
  const retry = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  return Response.json(
    { ok: false, reason: "rate_limited", message: `Too many requests. Please wait ${retry} second${retry === 1 ? "" : "s"} and try again.` },
    { status: 429, headers: { "Retry-After": String(retry) } },
  );
}

/** Per-route budgets: generous for a person, tight for a loop. */
export const LIMITS = {
  ai: { limit: 20, windowMs: 60_000 },        // AI answers, inspections, recommendations
  analysis: { limit: 6, windowMs: 60_000 },   // site analysis: geocoding + Claude per call
  lookup: { limit: 60, windowMs: 60_000 },    // weather, geocode
} as const satisfies Record<string, RateLimit>;
