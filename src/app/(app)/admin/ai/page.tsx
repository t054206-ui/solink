import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { Badge } from "@/components/ui/Badge";
import { serverEnv } from "@/lib/config/env";
import { isClaudeConfigured, SOLINK_AI_RULES } from "@/lib/ai/claude";

export const metadata: Metadata = { title: "Admin · AI Configuration" };

const DEPENDENT_FEATURES: { feature: string; route: string; what: string }[] = [
  { feature: "AI Solar Agent", route: "/agent", what: "Conversational help grounded in the user's own data." },
  { feature: "Image inspection", route: "/maintenance", what: "Cautious observations about panel photos (never a definitive diagnosis)." },
  { feature: "AI recommendation", route: "/recommend", what: "Trade-off explanation between candidate systems." },
  { feature: "Placement suggestion", route: "/designer", what: "Suggested panel layout on the roof." },
  { feature: "Monitoring interpretation", route: "/monitoring", what: "Alerts and explanations of production patterns." },
  { feature: "Report explanations", route: "/reports", what: "Plain-language observations in monthly reports." },
];

export default function AiConfigPage() {
  const model = serverEnv().claudeModel; // process.env.CLAUDE_MODEL ?? "claude-opus-5"
  const connected = isClaudeConfigured();
  return (
    <>
      <PageHeader eyebrow="Admin" title="AI Configuration" description="One Claude client serves every AI feature; the reliability rules below are prepended to every call." />
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card><CardBody className="pt-5"><div className="text-[12.5px] font-medium text-fg-secondary">Configured model</div><div className="mt-1 font-mono text-lg text-fg">{model}</div><div className="mt-1 text-[11.5px] text-fg-muted">From <code className="font-mono">CLAUDE_MODEL</code> (default claude-opus-5). Changing it does not require a code change.</div></CardBody></Card>
          <Card><CardBody className="pt-5"><div className="text-[12.5px] font-medium text-fg-secondary">Connection</div>
            <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-fg">{connected ? <><CheckCircle2 className="size-5 text-good-fg" aria-hidden /> Connected</> : <><XCircle className="size-5 text-fg-muted" aria-hidden /> Not connected</>}</div>
            <div className="mt-1 text-[11.5px] text-fg-muted">{connected ? "CLAUDE_API_KEY is set (server-side). The key itself is never displayed." : <>Set <code className="font-mono">CLAUDE_API_KEY</code> server-side: <Placeholder k="CLAUDE_API_KEY" /></>}</div></CardBody></Card>
        </div>

        <Card>
          <CardHeader title="Reliability rules (system prompt)" subtitle="SOLINK_AI_RULES from src/lib/ai/claude.ts: cached and sent with every request." />
          <CardBody><pre className="whitespace-pre-wrap rounded-[10px] border border-border bg-inset p-3 font-mono text-[12px] leading-relaxed text-fg-secondary">{SOLINK_AI_RULES}</pre></CardBody>
        </Card>

        <Card>
          <CardHeader title="Features that depend on this connection" subtitle="Without the key each feature shows an honest “AI unavailable” state instead of guessing." />
          <CardBody>
            <ul className="divide-y divide-border">
              {DEPENDENT_FEATURES.map((f) => (
                <li key={f.feature} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13.5px]"><div><span className="font-medium text-fg">{f.feature}</span> <span className="text-fg-muted">· {f.route}</span><div className="text-[12.5px] text-fg-secondary">{f.what}</div></div><Badge tone={connected ? "good" : "neutral"}>{connected ? "Active" : "Unavailable"}</Badge></li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Future thresholds" subtitle="Monitoring alert thresholds are a platform setting, not an AI guess." />
          <CardBody className="space-y-3">
            <PlaceholderNote k="PRODUCTION_ALERT_THRESHOLDS" />
            <p className="text-[13px] text-fg-secondary">Once decided, enter warning / alert percentages with their source under <a href="/admin/settings" className="underline underline-offset-2">Platform Settings → production_alert_thresholds</a>. Until then the monitoring page reports “insufficient data” rather than inventing a threshold.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
