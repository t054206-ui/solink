import { redirect } from "next/navigation";

/** The manufacturer's home is the role dashboard; the sidebar points there. */
export default function ManufacturerIndex() {
  redirect("/dashboard");
}
