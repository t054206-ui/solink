import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

/**
 * Hover is a deliberate change of surface, never a fade. Opacity transitions
 * read as an element switching off; a colour step reads as a response.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color] duration-150 " +
  "disabled:pointer-events-none disabled:saturate-0 disabled:text-fg-muted disabled:bg-inset disabled:border-border";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:bg-[var(--brand-strong)] hover:text-white active:bg-[var(--brand-strong)]",
  secondary: "bg-[var(--indigo)] text-[#f6f1e8] hover:bg-[color-mix(in_oklab,var(--indigo)_82%,var(--brand))]",
  outline: "border border-[var(--brass)] bg-elevated text-fg hover:bg-inset hover:border-[var(--brand)]",
  ghost: "text-fg-secondary hover:bg-inset hover:text-fg",
  danger: "bg-[var(--critical)] text-white hover:bg-[color-mix(in_oklab,var(--critical)_80%,black)]",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; href?: string; children: ReactNode;
}

export function Button({ variant = "primary", size = "md", href, className, children, ...rest }: ButtonProps) {
  const cls = cn(base, variants[variant], sizes[size], className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}
