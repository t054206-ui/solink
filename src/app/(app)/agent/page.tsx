import { BookOpen, Info, Bot } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DataBadge } from "@/components/ui/DataBadge";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { AgentChat } from "@/components/agent/AgentChat";
import { InfoTip } from "@/components/help/InfoTip";
import { isClaudeConfigured } from "@/lib/ai/claude";
import { loadOperateContext } from "../_operate/loadSystem";

export const metadata = {
  title: "AI Solar Agent · Solink",
  description: "Ask Solink about your own solar system. The agent reads your actual data before answering and never invents figures.",
};

const LAYERS = [
  { icon: BookOpen, name: "User Guide", answers: "How does the website work?", href: "/guide", detail: "Step-by-step help for every part of Solink." },
  { icon: Info, name: "Info icons", answers: "What does this technical term mean?", href: null, detail: "The small ⓘ beside a term opens a plain-language definition." },
  { icon: Bot, name: "AI Solar Agent", answers: "What does this mean for MY solar system?", href: null, detail: "Answers about your own data — this page." },
];

const RULES = [
  "It answers only from your data. If something is missing it says “I don't have enough information to determine that” and tells you what is needed.",
  "It labels what it says: observed, calculated, estimated, or its own interpretation.",
  "It never invents measurements, prices, weather, production or maintenance history.",
  "It will not claim a component is definitely damaged, or that equipment will definitely fail.",
  "It explains trade-offs instead of naming one product objectively best.",
];

export default async function AgentPage() {
  const ctx = await loadOperateContext();
  const configured = isClaudeConfigured();

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="AI Solar Agent"
        description="One assistant across the whole platform. Ask about production, cleaning, maintenance, reports or anything in your Solar Passport."
      />

      {ctx.mode === "demo" && (
        <DemoBanner className="mb-4" detail="The agent will read the labeled demo system, and will say so in its answers." />
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AgentChat systemId={ctx.system?.id} />
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Three layers of help" subtitle="Each answers a different kind of question." />
            <CardBody>
              <ul className="space-y-3">
                {LAYERS.map((l) => (
                  <li key={l.name} className="flex gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-[var(--brand-strong)]">
                      <l.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[13.5px] font-semibold text-fg">
                        {l.href ? <Link href={l.href} className="underline-offset-2 hover:underline">{l.name}</Link> : l.name}
                        {l.name === "Info icons" && <InfoTip term="kwh" className="ml-1" />}
                      </h3>
                      <p className="text-[13px] italic text-fg-secondary">“{l.answers}”</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">{l.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="How the agent behaves" action={<DataBadge cls="ai" compact />} />
            <CardBody>
              <ul className="space-y-2 text-[13px] leading-relaxed text-fg-secondary">
                {RULES.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand-strong)]" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="What it can see right now" subtitle="The agent is given this, and nothing else." />
            <CardBody>
              <ul className="space-y-1.5 text-[13px] text-fg-secondary">
                <li className="flex items-center justify-between gap-2"><span>Solar profile</span><DataBadge cls={ctx.profile ? (ctx.mode === "demo" ? "demo" : "user") : "unavailable"} compact /></li>
                <li className="flex items-center justify-between gap-2"><span>System &amp; Solar Passport</span><DataBadge cls={ctx.system ? (ctx.system.is_demo ? "demo" : "source") : "unavailable"} compact /></li>
                <li className="flex items-center justify-between gap-2"><span>Production records</span><DataBadge cls={ctx.mode === "demo" ? "demo" : "source"} compact /></li>
                <li className="flex items-center justify-between gap-2"><span>Maintenance &amp; incidents</span><DataBadge cls={ctx.mode === "demo" ? "demo" : "source"} compact /></li>
                <li className="flex items-center justify-between gap-2"><span>Monthly reports</span><DataBadge cls={ctx.mode === "demo" ? "demo" : "source"} compact /></li>
                <li className="flex items-center justify-between gap-2"><span>Marketplace products</span><DataBadge cls={ctx.mode === "demo" ? "demo" : "source"} compact /></li>
                <li className="flex items-center justify-between gap-2"><span>Live hardware readings</span><DataBadge cls="unavailable" compact /></li>
              </ul>
            </CardBody>
          </Card>

          {!configured && (
            <Card>
              <CardHeader title="The agent is not connected yet" />
              <CardBody><PlaceholderNote k="CLAUDE_API_KEY" /></CardBody>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
