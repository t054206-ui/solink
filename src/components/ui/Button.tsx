import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const base = "inline-flex items-center justify-center gap-2 font-medium rounded-[10px] transition-colors disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:bg-brand-strong shadow-sm",
  secondary: "bg-navy text-white hover:opacity-90 dark:bg-white/10 dark:hover:bg-white/15",
  outline: "border border-border-strong bg-elevated text-fg hover:bg-inset",
  ghost: "text-fg-secondary hover:bg-inset hover:text-fg",
  danger: "bg-critical text-white hover:opacity-90",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; href?: string; children: ReactNode;
}

export function Button({ variant = "primary", size = "md", href, className, children, ...rest }: ButtonProps) {
  const cls = cn(base, variants[variant], sizes[size], className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}
