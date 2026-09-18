import { integrationStatus } from "@/lib/config/env";
/** Booleans only — never returns key material. */
export async function GET() {
  return Response.json({ integrations: integrationStatus().map(({ key, label, connected, placeholder }) => ({ key, label, connected, placeholder })) });
}
