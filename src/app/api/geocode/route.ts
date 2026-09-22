import { z } from "zod";
import { geocode, reverseGeocode } from "@/lib/maps/google";
import { requireUser } from "@/lib/api/auth";
import { checkRateLimit, rateLimitKey, LIMITS } from "@/lib/api/rateLimit";

const Q = z.object({ address: z.string().min(2).max(300).optional(), lat: z.coerce.number().optional(), lng: z.coerce.number().optional() });

/** Address ⇄ coordinates via Google Maps Platform (server key). Never place personal data in URLs beyond the address being searched. */
export async function GET(req: Request) {
  const gate = await requireUser();
  if ("response" in gate) return gate.response;
  const limited = checkRateLimit(rateLimitKey(req, gate.user.id === "demo" ? null : gate.user.id, "geocode"), LIMITS.lookup);
  if (limited) return limited;
  const parsed = Q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return Response.json({ ok: false, reason: "invalid_input", message: "Provide an address or lat/lng." }, { status: 400 });
  const { address, lat, lng } = parsed.data;
  const r = address ? await geocode(address) : lat !== undefined && lng !== undefined ? await reverseGeocode(lat, lng) : null;
  if (!r) return Response.json({ ok: false, reason: "invalid_input", message: "Provide an address or lat/lng." }, { status: 400 });
  return Response.json(r, { status: r.ok ? 200 : r.reason === "not_configured" ? 503 : 502 });
}
