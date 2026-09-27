"use client";
import { useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/Button";

export function ResetLinkInvalid() {
  const t = useT();
  return (
    <div className="grid gap-4">
      <h1 className="display text-[30px] text-fg sm:text-[34px]">{t("reset.invalidTitle")}</h1>
      <p className="text-[14.5px] leading-relaxed text-fg-secondary">{t("reset.invalid")}</p>
      <Button href="/forgot-password" size="lg" className="w-full">{t("reset.request")}</Button>
    </div>
  );
}
