import { createClient } from "@/lib/supabase/server";
import type { ProviderAccess } from "./access";
import { rowsToServiceMap, type ProviderPriceRow, type ServiceMap } from "./services";

/**
 * The provider's own price list (provider_prices, RLS-scoped to my_provider_id()).
 * Demo mode has no server rows: the services page reads the local store instead.
 */
export async function loadProviderServices(access: ProviderAccess): Promise<ServiceMap> {
  if (access.mode === "demo" || !access.providerId) return {};
  const c = await createClient();
  if (!c) return {};
  const { data, error } = await c
    .from("provider_prices")
    .select("id, service, price, currency, notes, updated_at")
    .eq("provider_id", access.providerId);
  if (error) return {};
  return rowsToServiceMap((data ?? []) as ProviderPriceRow[]);
}
