"use client";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { BASKET_STORE_KEY, EMPTY_BASKET, basketCount, type BasketStore } from "@/lib/basket";

/** Basket icon with a live count in the app header — visible to signed-in people and guests alike. */
export function BasketHeaderIcon() {
  const [basket, , loaded] = useLocalStore<BasketStore>(BASKET_STORE_KEY, EMPTY_BASKET);
  const count = loaded ? basketCount(basket) : 0;
  return (
    <Link href="/basket" aria-label={`Basket${count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`} className="relative grid size-9 place-items-center rounded-[var(--radius)] text-fg-muted hover:bg-inset hover:text-fg">
      <ShoppingCart className="size-4" aria-hidden />
      {count > 0 && (
        <span className="tabular absolute -right-0.5 -top-0.5 grid min-w-[16px] place-items-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-semibold leading-4 text-[var(--brand-fg)]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
