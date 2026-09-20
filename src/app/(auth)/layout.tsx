import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Lattice } from "@/components/brand/Lattice";
import { SkipLink } from "@/components/layout/SkipLink";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <SkipLink />
      <div className="ink-light relative hidden lg:flex flex-col justify-between overflow-hidden bg-[var(--indigo)] p-10 text-[#f6f1e8]">
        <Lattice size={88} />
        <Logo className="relative text-white" />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight">One connected solar ecosystem.</h2>
          <p className="mt-3 max-w-md text-white/75 leading-relaxed">Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize.</p>
        </div>
        <div className="relative text-[12px] text-white/50">Solink · Kuwait &amp; GCC</div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div id="main" className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          {children}
        </div>
      </div>
    </div>
  );
}
