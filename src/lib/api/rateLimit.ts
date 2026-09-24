import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for routes that spend money (Claude, WeatherAPI, Google) or
 * do heavy work.
 *
 * When a Redis store is attached to the project through Vercel's Marketplace
 * (Storage → Create Database → a Redis provider, e.g. Upstash), Vercel
 * injects a REST URL and token — under either the older KV_REST_API_* names
 * or the newer UPSTASH_REDIS_REST_* names, depending on which integration
 * was used, so both are checked. When present, the counter lives there: one
 * count per key, shared by every server instance, which is what makes the
 * limit real. Without a store attached (local dev, or before the dashboard
 * step in docs/SECURITY-AUDIT-2026-09-22.md is done), this falls back to the
 * previous in-memory counter — per-instance only, but still stops a tight
 * loop from one client and costs nothing. No caller needs to know which mode
 * is active.
 */
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const buckets = new Map<string, { count: number; resetAt: number }>();
let sweepAt = 0;

export interface RateLimit { limit: number; windowMs: number }

/** Sign-in gated routes limit per user; the key falls back to the client address when there is no user. */
export function rateLimitKey(req: Request, userId: string | null, route: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `${route}:${userId ?? `ip:${ip}`}`;
}

function tooManyRequests(retry: number): Response {
  return Response.json(
    { ok: false, reason: "rate_limited", message: `Too many requests. Please wait ${retry} second${retry === 1 ? "" : "s"} and try again.` },
    { status: 429, headers: { "Retry-After": String(retry) } },
  );
}

function checkRateLimitLocal(key: string, { limit, windowMs }: RateLimit): Response | null {
  const now = Date.now();
  if (now > sweepAt) { for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k); sweepAt = now + windowMs; }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return null; }
  b.count += 1;
  if (b.count <= limit) return null;
  return tooManyRequests(Math.max(1, Math.ceil((b.resetAt - now) / 1000)));
}

/** Returns null when allowed, or the 429 response to send. */
export async function checkRateLimit(key: string, { limit, windowMs }: RateLimit): Promise<Response | null> {
  if (!redis) return checkRateLimitLocal(key, { limit, windowMs });
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  if (count <= limit) return null;
  const ttl = await redis.ttl(key);
  return tooManyRequests(ttl > 0 ? ttl : windowSec);
}

/** Per-route budgets: generous for a person, tight for a loop. */
export const LIMITS = {
  ai: { limit: 20, windowMs: 60_000 },        // AI answers, inspections, recommendations
  analysis: { limit: 6, windowMs: 60_000 },   // site analysis: geocoding + Claude per call
  lookup: { limit: 60, windowMs: 60_000 },    // weather, geocode
} as const satisfies Record<string, RateLimit>;
