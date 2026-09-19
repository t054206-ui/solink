"use client";
import { cn } from "@/lib/utils";
import { useId, cloneElement, isValidElement, type ReactElement } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, LabelHTMLAttributes } from "react";

const field =
  "w-full rounded-[var(--radius)] border border-border-strong bg-elevated px-2.5 text-[13px] text-fg " +
  "placeholder:text-fg-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--ring)] " +
  "disabled:opacity-60";

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

/**
 * A labelled control.
 *
 * The label is tied to its control with htmlFor/id, so clicking the label moves
 * focus and a screen reader announces the two together. Help and error text are
 * linked through aria-describedby, and an error sets aria-invalid, so the field
 * announces its own state rather than relying on the red text being noticed.
 *
 * The hint slot sits outside the <label>, because it usually holds an InfoTip
 * button and a button nested in a label steals the label's click.
 */
export function Field({
  label, hint, children, help, error, className,
}: {
  label: ReactNode; hint?: ReactNode; children: ReactNode; help?: ReactNode; error?: string; className?: string;
}) {
  const id = useId();
  const controlId = `${id}-control`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help && !error ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  // Wire the control up when it is a single element; otherwise leave it alone
  // and fall back to the label's own association.
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (children.props as Record<string, unknown>).id ?? controlId,
        "aria-describedby": (children.props as Record<string, unknown>)["aria-describedby"] ?? describedBy,
        ...(error ? { "aria-invalid": true } : {}),
      })
    : children;

  const forId = isValidElement(children)
    ? ((children.props as Record<string, unknown>).id as string | undefined) ?? controlId
    : undefined;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={forId} className="text-[13px] font-medium text-fg-secondary">
          {label}
        </label>
        {hint}
      </div>
      {control}
      {help && !error && <p id={helpId} className="mt-1 text-[12px] text-fg-muted">{help}</p>}
      {error && <p id={errorId} className="mt-1 text-[12px] text-critical-fg" role="alert">{error}</p>}
    </div>
  );
}
