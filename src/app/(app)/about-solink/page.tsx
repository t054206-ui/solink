import type { Metadata } from "next";
import { AboutPage } from "@/app/(marketing)/about/AboutPage";

export const metadata: Metadata = {
  title: "About",
  description: "What Solink is, who is building it, and how its services fit together, without leaving the app.",
};

export default function AboutSolinkPage() {
  return <AboutPage inApp />;
}
