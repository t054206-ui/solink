import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-navy p-10 text-white">
        <div className="absolute inset-0 sun-glow opacity-90" />
        <div className="absolute inset-0 solar-grid opacity-40" />
        <Logo className="relative text-white" />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight">One connected solar ecosystem.</h2>
          <p className="mt-3 max-w-md text-white/75 leading-relaxed">Analyze → Calculate → Compare → Design → Purchase → Install → Monitor → Maintain → Report → Optimize.</p>
        </div>
        <div className="relative text-[12px] text-white/50">Solink · Kuwait &amp; GCC</div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          {children}
        </div>
      </div>
    </div>
  );
}
