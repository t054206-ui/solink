import { createClient } from "@/lib/supabase/server";
import { getDataMode } from "@/lib/data/mode";
import { listProducts } from "@/lib/data/repositories";
import type { Product } from "@/lib/types";
import type { ProductDocumentRow } from "@/app/(app)/admin/_lib/data";

/** The manufacturer's own catalogue, archived rows included so nothing they published goes missing from their view. */
export async function listOwnProducts(manufacturerId: string | null): Promise<{ data: Product[]; mode: "demo" | "supabase" }> {
  const { data, mode } = await listProducts({ includeArchived: true });
  return { data: manufacturerId ? data.filter((p) => p.manufacturer_id === manufacturerId) : [], mode };
}

/** Documents attached to the given products. Read is open under RLS; demo mode has none server-side. */
export async function listDocumentsFor(productIds: string[]): Promise<ProductDocumentRow[]> {
  if (getDataMode() === "demo" || productIds.length === 0) return [];
  const c = await createClient();
  if (!c) return [];
  const { data } = await c.from("product_documents").select("id, product_id, kind, title, storage_path, url, created_at").in("product_id", productIds).order("created_at", { ascending: false });
  return (data ?? []) as ProductDocumentRow[];
}
