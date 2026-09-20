import type { Metadata } from "next";
import { AboutPage } from "./AboutPage";

/**
 * Title deliberately omits the brand: the root layout's template appends
 * " · Solink", and the copy rules say a page title must not repeat it.
 */
export const metadata: Metadata = {
  title: "About",
  description:
    "Solink is building one connected platform for the whole solar journey, from solar potential to panels, installation, monitoring and maintenance. Designed first for Kuwait and the GCC.",
};

export default function Page() {
  return <AboutPage />;
}
