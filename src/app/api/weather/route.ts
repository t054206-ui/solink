import { z } from "zod";
import { getWeatherBundle } from "@/lib/weather/weatherapi";
import { requireUser } from "@/lib/api/auth";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/api/rateLimit";

const Q = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180), days: z.coerce.number().int().min(1).max(7).default(3) });

/** Weather + air quality for a coordinate. Server-side only (key never reaches the browser). */
export async function GET(req: Request) {
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const limited = await checkRateLimit(rateLimitKey(req, gate.user.id === "demo" ? null : gate.user.id, "weather"), LIMITS.lookup);
  if (limited) return limited;
  const url = new URL(req.url);
  const parsed = Q.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid_input", message: "lat and lng are required." }, { status: 400 });
  const r = await getWeatherBundle(parsed.data.lat, parsed.data.lng, parsed.data.days);
  return Response.json(r, { status: r.ok ? 200 : r.reason === "not_configured" ? 503 : 502 });
}
