import type { Metadata } from "next";
import { GuideContent } from "./_components/GuideContent";

export const metadata: Metadata = {
  title: "User Guide",
  description:
    "A plain-language guide to using Solink: analyze your home, size and choose a solar system, design it, arrange installation, then monitor, maintain and report on it.",
};

export default function GuidePage() {
  return <GuideContent />;
}
