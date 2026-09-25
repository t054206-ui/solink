import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDataMode } from "@/lib/data/mode";
import { listProducts } from "@/lib/data/repositories";
import { createClient } from "@/lib/supabase/server";
import { BasketView } from "./BasketView";

export const metadata: Metadata = {
  title: "Basket",
  description: "Review what you've added and send it as a request. Solink does not process payment online.",
};

export default async function BasketPage() {
  const mode = getDataMode();
  const [{ data: catalog }, isAuthenticated] = await Promise.all([
    listProducts().catch(() => ({ data: [], mode })),
    (async () => {
      if (mode === "demo") return false;
      const c = await createClient();
      if (!c) return false;
      const { data: { user } } = await c.auth.getUser();
      return Boolean(user);
    })(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Basket"
        title="Basket"
        description="Everything here is saved in your browser until you check out. No account is needed to browse, compare or add products, only to send the request."
      />
      <BasketView catalog={catalog} isAuthenticated={isAuthenticated} mode={mode} />
    </div>
  );
}
