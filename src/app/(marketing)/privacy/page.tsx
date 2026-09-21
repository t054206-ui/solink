import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

/** Title omits the brand: the root template appends " · Solink". */
export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Solink collects, why, who can see it, and what you can ask us to do with it. Written from how the platform is actually built.",
};

export default function Page() {
  return <LegalPage doc="privacy" />;
}
