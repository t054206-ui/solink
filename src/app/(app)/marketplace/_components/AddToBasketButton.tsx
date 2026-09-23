"use client";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { addLine, BASKET_STORE_KEY, EMPTY_BASKET, lineQty, setLineQty, type BasketStore } from "@/lib/basket";
import { cn } from "@/lib/utils";

/**
 * Add-to-basket control for a product card or the product detail page.
 * Works for guests and signed-in people alike — the basket is per-browser
 * storage until Checkout; nothing here needs an account. Once a quantity is
 * in the basket the button becomes a stepper.
 */
export function AddToBasketButton({ productId, price, currency, size = "sm", className }: { productId: string; price: number | null; currency: string; size?: "sm" | "md"; className?: string }) {
  const [basket, setBasket, loaded] = useLocalStore<BasketStore>(BASKET_STORE_KEY, EMPTY_BASKET);
  const qty = lineQty(basket, productId);

  if (qty > 0) {
    return (
      <div role="group" aria-label="Quantity in basket" className={cn("inline-flex items-center gap-0.5 rounded-[var(--radius)] border border-border-strong bg-elevated", size === "sm" ? "h-7 px-0.5" : "h-9 px-1", className)}>
        <button type="button" onClick={() => setBasket((p) => setLineQty(p, productId, qty - 1))} aria-label="Decrease quantity" className="grid size-6 place-items-center rounded text-fg-secondary hover:bg-inset hover:text-fg">
          <Minus className="size-3.5" aria-hidden />
        </button>
        <span className="tabular w-6 text-center text-[12.5px] font-medium text-fg" aria-live="polite">{qty}</span>
        <button type="button" onClick={() => setBasket((p) => setLineQty(p, productId, qty + 1))} aria-label="Increase quantity" className="grid size-6 place-items-center rounded text-fg-secondary hover:bg-inset hover:text-fg">
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <Button type="button" size={size} variant="outline" disabled={!loaded} className={className} onClick={() => setBasket((p) => addLine(p, productId, price, currency))}>
      <ShoppingCart className="size-3.5" aria-hidden /> Add to basket
    </Button>
  );
}
