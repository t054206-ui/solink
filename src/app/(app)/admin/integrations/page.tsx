import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Placeholder } from "@/components/ui/Placeholder";
import { integrationStatus, type AnalysisRole } from "@/lib/config/env";
import type { PlaceholderKey } from "@/lib/config/placeholders";
import { Table, Th, Td } from "../_components/AdminBits";

export const metadata: Metadata = { title: "Admin · API Integrations" };

/** What each service means for the Solar Site Analysis workflow. */
const ANALYSIS_ROLE: Record<AnalysisRole, string> = {
  required: "Required",
  optional: "Optional: adds roof measurements",
  not_used: "Not used",
};

export default function IntegrationsPage() {
  const rows = integrationStatus();
  return (
    <>
      <PageHeader eyebrow="Admin" title="API Integrations" description="Which external services are connected, and what each one means for the Solar Site Analysis workflow. This page only ever shows booleans: key values never leave the server." />
      <div className="space-y-4">
        <Table caption="Integration status">
          <thead><tr><Th>Integration</Th><Th>Connected</Th><Th>Site analysis</Th><Th>Environment variables required</Th><Th>When not connected</Th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <Td className="font-medium text-fg">{r.label}</Td>
                <Td>{r.connected ? <span className="inline-flex items-center gap-1 text-good-fg"><CheckCircle2 className="size-4" aria-hidden /> Yes</span> : <span className="inline-flex items-center gap-1 text-fg-muted"><XCircle className="size-4" aria-hidden /> No</span>}</Td>
                <Td>{ANALYSIS_ROLE[r.analysisRole]}</Td>
                <Td>{r.envVars.length ? <ul className="space-y-0.5">{r.envVars.map((v) => <li key={v}><code className="font-mono text-[11.5px]">{v}</code></li>)}</ul> : <span className="text-fg-muted">No env var. Needs a product/integration decision</span>}</Td>
                <Td><Placeholder k={r.placeholder as PlaceholderKey} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="text-[12.5px] text-fg-muted">Set variables in <code className="font-mono">.env.local</code> (see <code className="font-mono">docs/ENVIRONMENT.md</code> and <code className="font-mono">.env.example</code>) and restart the server. Server-only keys must never use the <code className="font-mono">NEXT_PUBLIC_</code> prefix.</p>
      </div>
    </>
  );
}
