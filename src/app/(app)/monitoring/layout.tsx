import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonitoringNav } from "./_components/MonitoringNav";

export default function MonitoringLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <PageHeader
        eyebrow="Operate"
        title="Monitoring"
        description="How your system is performing, what the weather is doing, and whether cleaning or an inspection may be useful. Every figure says where it comes from."
        className="mb-4"
      />
      <MonitoringNav />
      {children}
    </div>
  );
}
