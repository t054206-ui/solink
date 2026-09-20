"use client";
import { Logo } from "@/components/brand/Logo";
import { LocaleToggle } from "@/components/layout/LocaleToggle";

/** The one row a phone gets above the form: the mark, and the language you would switch to. */
export function AuthMobileHeader() {
  return (
    <div className="flex items-center justify-between lg:hidden">
      <Logo />
      <LocaleToggle />
    </div>
  );
}
