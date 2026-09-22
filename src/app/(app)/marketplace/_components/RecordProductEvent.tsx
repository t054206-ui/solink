"use client";
import { useEffect, useRef } from "react";
import type { ProductEventKind } from "@/lib/types";
import { recordProductEventAction } from "../actions";

/**
 * Fire-and-forget activity record, once per mount. Renders nothing. The
 * server action decides whether anything is written (signed in, Supabase
 * mode); this component never blocks or changes the page.
 */
export function RecordProductEvent({ productIds, kind }: { productIds: string[]; kind: ProductEventKind }) {
  const key = productIds.join("|");
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (!key || sent.current === key) return;
    sent.current = key;
    void recordProductEventAction({ productIds, kind }).catch(() => undefined);
  }, [key, kind, productIds]);
  return null;
}
