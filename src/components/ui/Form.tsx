import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, LabelHTMLAttributes } from "react";

const field = "w-full rounded-[var(--radius)] border border-border-strong bg-elevated px-2.5 text-[13px] text-fg placeholder:text-fg-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-60";

export function Label({ className, children, hint, ...rest }: LabelHTMLAttributes<HTMLLabelElement> & { hint?: ReactNode }) {
  return (
    <label className={cn("mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-fg-secondary", className)} {...rest}>
      {children}{hint}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-9 max-[767px]:h-11", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, "h-9 max-[767px]:h-11", className)} {...rest}>{children}</select>;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "py-2 min-h-24", className)} {...rest} />;
}

export function Field({ label, hint, children, help, error, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; help?: ReactNode; error?: string; className?: string }) {
  return (
    <div className={className}>
      <Label hint={hint}>{label}</Label>
      {children}
      {help && !error && <p className="mt-1 text-[12px] text-fg-muted">{help}</p>}
      {error && <p className="mt-1 text-[12px] text-critical-fg" role="alert">{error}</p>}
    </div>
  );
}
