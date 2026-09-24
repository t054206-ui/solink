"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { productText } from "@/lib/config/placeholders";

/**
 * Audit mode: the admin, provider and manufacturer areas keep the raw
 * placeholder tokens and "N/A" badges, because the people there are the ones
 * who fill them in. Homeowner screens (everything else) run without it and
 * show product wording instead (owner, 2026-09-24).
 */
const AuditContext = createContext(false);

export function AuditMode({ children }: { children: ReactNode }) {
  return <AuditContext.Provider value={true}>{children}</AuditContext.Provider>;
}

export function useAuditMode(): boolean {
  return useContext(AuditContext);
}

const AUDIT_PREFIXES = ["/admin", "/provider", "/manufacturer"];

/**
 * The last line of defence on homeowner screens: if a placeholder token still
 * reaches the page (from a reason string, a server message, anything), it is
 * rewritten into product words before it can be read. Values are never
 * invented; the token is only reworded or dropped.
 */
export function PlaceholderGuard() {
  const pathname = usePathname() ?? "";
  const audit = AUDIT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  useEffect(() => {
    if (audit || typeof MutationObserver === "undefined") return;
    const root = document.getElementById("main") ?? document.body;
    const clean = (node: Node) => {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        const v = t.nodeValue;
        if (v && v.includes("[PLACEHOLDER")) t.nodeValue = productText(v);
      }
    };
    // The first sweep waits until the page has loaded and hydrated, so it never
    // rewrites server markup React is still reconciling. Sources are cleaned at
    // their origin; this only catches what slips through.
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") clean(r.target);
        r.addedNodes.forEach((n) => clean(n));
      }
    });
    const start = () => window.setTimeout(() => { clean(root); obs.observe(root, { subtree: true, childList: true, characterData: true }); }, 1500);
    let t: number | undefined;
    const onLoad = () => { t = start(); };
    if (document.readyState === "complete") onLoad(); else window.addEventListener("load", onLoad, { once: true });
    return () => { obs.disconnect(); window.removeEventListener("load", onLoad); if (t) window.clearTimeout(t); };
  }, [audit, pathname]);
  return null;
}
