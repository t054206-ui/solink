"use client";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { EmptyState, Skeleton } from "@/components/ui/States";
import type { Manufacturer, Product, ProviderCompany } from "@/lib/types";
import { ProductForm } from "./ProductForm";
import { ADMIN_PRODUCTS_STORE, type AdminProductStore } from "./admin-helpers";

/** Demo mode: prefer the locally edited copy of a product (browser storage) over the demo record. */
export function ProductEditLoader({ id, server, manufacturers, providers }: { id: string; server: Product | null; manufacturers: Manufacturer[]; providers: ProviderCompany[] }) {
  const [store, , loaded] = useLocalStore<AdminProductStore>(ADMIN_PRODUCTS_STORE, {});
  if (!loaded) return <Skeleton className="h-40" />;
  const initial = store[id] ?? server;
  if (!initial) return <EmptyState title="No product with this id">It may have been created in another browser (demo-mode records never leave the device).</EmptyState>;
  return <ProductForm key={initial.id} initial={initial} manufacturers={manufacturers} providers={providers} mode="demo" />;
}
