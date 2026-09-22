import type { Metadata } from "next";
import { SectionShell } from "../_components/SectionShell";

export const metadata: Metadata = { title: "Settings" };

export default function ManufacturerSettingsPage() {
  return (
    <SectionShell
      title="Settings"
      description="Your account on Solink: language, notifications and sign-in. Company details live under Company Profile."
      emptyTitle="No settings to change here yet"
      emptyBody={<p>Language and theme are in the top bar. Sign-out is at the bottom of the sidebar. Password changes go through the email Supabase sends from the sign-in page.</p>}
      needs={{ title: "ACCOUNT SETTINGS PAGE", body: "Notification preferences depend on the email provider decision (placeholder EMAIL / NOTIFICATION PROVIDER). A profile name field for the signed-in person is straightforward and can be added on request." }}
    />
  );
}
