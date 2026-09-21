import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

/** Title omits the brand: the root template appends " · Solink". */
export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for using Solink and the limits of what it can promise: information with its provenance, not advice; independent providers; no payments yet.",
};

export default function Page() {
  return <LegalPage doc="terms" />;
}
