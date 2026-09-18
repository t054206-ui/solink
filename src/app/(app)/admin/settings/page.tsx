import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/ui/States";
import { listSettingRows } from "../_lib/data";
import { SettingsForm } from "../_components/SettingsForm";

export const metadata: Metadata = { title: "Admin · Platform Settings" };

export default async function SettingsPage() {
  const s = await listSettingRows();
  return (
    <>
      <PageHeader eyebrow="Admin" title="Platform Settings" description="Platform-wide assumptions (platform_settings). NULL means “not provided” and the matching placeholder is shown across Solink. Every value needs a source." />
      <div className="space-y-4">
        {s.error && <ErrorState>{s.error}</ErrorState>}
        <SettingsForm rows={s.data} mode={s.mode} />
      </div>
    </>
  );
}
