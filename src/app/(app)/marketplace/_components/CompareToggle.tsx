"use client";
import { Check, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocalStore } from "@/lib/hooks/useLocalStore";
import { COMPARE_MAX, COMPARE_STORE_KEY } from "./product-helpers";

/** Adds / removes a product id from the per-browser comparison list (max COMPARE_MAX). */
export function CompareToggle({ id, size = "sm", className }: { id: string; size?: "sm" | "md"; className?: string }) {
  const [ids, setIds, loaded] = useLocalStore<string[]>(COMPARE_STORE_KEY, []);
  const selected = ids.includes(id);
  const full = !selected && ids.length >= COMPARE_MAX;
  return (
    <Button
      type="button"
      size={size}
      variant={selected ? "secondary" : "outline"}
      className={className}
      aria-pressed={selected}
      disabled={!loaded || full}
      title={full ? `You can compare up to ${COMPARE_MAX} products at a time.` : undefined}
      onClick={() => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= COMPARE_MAX ? prev : [...prev, id]))}
    >
      {selected ? <Check className="size-3.5" aria-hidden /> : <GitCompare className="size-3.5" aria-hidden />}
      {selected ? "In comparison" : full ? "Comparison full" : "Compare"}
    </Button>
  );
}
