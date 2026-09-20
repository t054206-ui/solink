"use client";
import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Form";
import { useT } from "@/lib/i18n/provider";

/**
 * A password field with the standard eye toggle.
 *
 * The button flips the input between password and text; it is a real button
 * with a label that says what it will do, and aria-pressed says which state
 * it is in, so it works by keyboard and screen reader as well as by mouse.
 * The id and aria-describedby that <Field> hands down land on the input, not
 * on the wrapper, so the label still focuses the right control.
 */
export function PasswordInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...rest} type={shown ? "text" : "password"} className={`pe-10 ${className ?? ""}`} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? t("auth.hide") : t("auth.show")}
        aria-pressed={shown}
        className="absolute inset-y-0 end-0 flex w-10 items-center justify-center rounded-[var(--radius)] text-fg-muted hover:text-fg"
      >
        {shown ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
