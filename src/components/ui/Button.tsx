import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

/**
 * Safety orange is reserved for the primary action on a screen. Hover changes
 * the surface in 150ms; it never fades, because a fading control reads as
 * switching off rather than responding.
 */
const base =
  "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] font-medium whitespace-nowrap select-none " +
  "transition-colors duration-150 " +
  "disabled:pointer-events-none disabled:border-border disabled:bg-inset disabled:text-fg-muted";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--brand)] text-[var(--brand-fg)] hover:bg-[var(--brand-hover)]",
  secondary: "bg-[var(--indigo)] text-white hover:bg-[color-mix(in_oklab,var(--indigo)_85%,var(--brand))] dark:text-[var(--fg)]",
  outline: "border border-border-strong bg-elevated text-fg hover:border-[var(--brand)] hover:bg-inset",
  ghost: "text-fg-secondary hover:bg-inset hover:text-fg",
  danger: "bg-[var(--critical)] text-white hover:bg-[color-mix(in_oklab,var(--critical)_82%,black)]",
};
/* 36px is the row height; controls sit on the same rhythm as table rows.
   The 44px touch target is met on coarse pointers via the media query below. */
const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px]",
  md: "h-9 px-3 text-[13px]",
  lg: "h-10 px-4 text-[14px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; href?: string; children: ReactNode;
  /** With `href`: opens elsewhere. Used for links that leave Solink, which always say so. */
  target?: string; rel?: string;
}

export function Button({ variant = "primary", size = "md", href, className, children, target, rel, ...rest }: ButtonProps) {
  const cls = cn(base, variants[variant], sizes[size], "max-[767px]:min-h-11", className);
  if (href) return <Link href={href} className={cls} target={target} rel={rel}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}
