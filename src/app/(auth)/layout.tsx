import type { ReactNode } from "react";
import { SkipLink } from "@/components/layout/SkipLink";
import { AuthAside } from "@/components/auth/AuthAside";
import { AuthMobileHeader } from "@/components/auth/AuthMobileHeader";

/**
 * Sign in and sign up share one room: the object on the left, the form on the
 * right, both on the Studio palette. The aside is a client component because
 * its copy is bilingual; the layout itself stays on the server.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <SkipLink />
      <AuthAside />
      <div className="flex flex-col p-5 sm:p-8 lg:p-12">
        <AuthMobileHeader />
        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
