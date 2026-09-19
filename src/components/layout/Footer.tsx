import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="border-t border-[var(--brass)] bg-elevated">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-fg-muted">Solink connects homeowners, solar products, installers, maintenance providers, system data and AI into one solar-energy ecosystem for Kuwait and the GCC.</p>
        </div>
        <div>
          <h4 className="text-[13px] font-semibold text-fg">Platform</h4>
          <ul className="mt-2 space-y-1.5 text-[13px] text-fg-secondary">
            <li><Link href="/dashboard" className="hover:text-fg">Dashboard</Link></li>
            <li><Link href="/marketplace" className="hover:text-fg">Marketplace</Link></li>
            <li><Link href="/designer" className="hover:text-fg">Solar Designer</Link></li>
            <li><Link href="/agent" className="hover:text-fg">AI Solar Agent</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[13px] font-semibold text-fg">Help</h4>
          <ul className="mt-2 space-y-1.5 text-[13px] text-fg-secondary">
            <li><Link href="/guide" className="hover:text-fg">User Guide</Link></li>
            <li><Link href="/guide#quick-start" className="hover:text-fg">Quick Start</Link></li>
            <li><Link href="/admin/integrations" className="hover:text-fg">Integration status</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--brass)] py-4 text-center text-[12px] text-fg-muted">© {new Date().getFullYear()} Solink · Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize</div>
    </footer>
  );
}
