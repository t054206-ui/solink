import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonitoringNav } from "./_components/MonitoringNav";

export default function MonitoringLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <PageHeader
        eyebrow="Operate"
        title="Monitoring"
        description="How your system is performing, what the weather is doing, and whether cleaning or an inspection may be useful. Live hardware is not connected yet; everything shown says where its numbers come from."
        className="mb-4"
      />
      <MonitoringNav />
      {children}
    </div>
  );
}
