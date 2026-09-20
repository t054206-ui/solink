import type { ReactNode } from "react";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/layout/SkipLink";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <MarketingNav />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
