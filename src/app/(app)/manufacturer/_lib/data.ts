import { listProductDocuments, listProducts } from "@/lib/data/repositories";
import type { Product } from "@/lib/types";
import type { ProductDocumentRow } from "@/app/(app)/admin/_lib/data";

/** The manufacturer's own catalogue, archived rows included so nothing they published goes missing from their view. */
export async function listOwnProducts(manufacturerId: string | null): Promise<{ data: Product[]; mode: "demo" | "supabase" }> {
  const { data, mode } = await listProducts({ includeArchived: true });
  return { data: manufacturerId ? data.filter((p) => p.manufacturer_id === manufacturerId) : [], mode };
}

/** Documents attached to the given products (shared repository query). */
export async function listDocumentsFor(productIds: string[]): Promise<ProductDocumentRow[]> {
  const { data } = await listProductDocuments(productIds);
  return data as ProductDocumentRow[];
}
