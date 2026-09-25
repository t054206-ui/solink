import type { Metadata } from "next";
import { GuideContent } from "@/app/(marketing)/guide/_components/GuideContent";

export const metadata: Metadata = {
  title: "Guide",
  description: "How to use Solink, step by step, without leaving the app.",
};

export default function HelpPage() {
  return <GuideContent inApp />;
}
