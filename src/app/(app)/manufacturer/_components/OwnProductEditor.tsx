"use client";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { EmptyState, Skeleton } from "@/components/ui/States";
import type { Manufacturer, Product } from "@/lib/types";
import type { DataMode } from "@/lib/data/mode";
import { ProductForm } from "@/app/(app)/admin/_components/ProductForm";
import { ADMIN_PRODUCTS_STORE, type AdminProductStore } from "@/app/(app)/admin/_components/admin-helpers";
import { saveOwnProductAction } from "../actions";

/**
 * Edit one of the manufacturer's products. In demo mode the browser copy (where
 * the form saves) wins over the demo record, exactly as the admin loader does.
 * A product of another manufacturer is refused here as well as by the action.
 */
export function OwnProductEditor({ id, server, me, mode }: { id: string; server: Product | null; me: Manufacturer; mode: DataMode }) {
  const [store, , loaded] = useLocalStore<AdminProductStore>(ADMIN_PRODUCTS_STORE, {});
  if (mode === "demo" && !loaded) return <Skeleton className="h-40" />;
  const initial = (mode === "demo" ? store[id] : undefined) ?? server;
  if (!initial) return <EmptyState title="No product with this id">It may have been created in another browser (demo-mode records never leave the device).</EmptyState>;
  const mine = initial.manufacturer_id === me.id || (mode === "demo" && initial.manufacturer_name === me.name);
  if (!mine) return <EmptyState title="Not your product">This product belongs to another manufacturer. You can only edit your own.</EmptyState>;
  return <ProductForm key={initial.id} initial={initial} manufacturers={[me]} providers={[]} mode={mode} lockedManufacturer={me} canVerify={false} basePath="/manufacturer/products" saveAction={saveOwnProductAction} />;
}
