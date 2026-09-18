import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <Logo className="justify-center" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-fg-secondary">The page you were looking for does not exist.</p>
        <div className="mt-6 flex justify-center gap-2"><Button href="/">Home</Button><Button href="/dashboard" variant="outline">Dashboard</Button></div>
        <p className="mt-6 text-[13px] text-fg-muted">Need help? <Link href="/guide" className="underline underline-offset-2">Read the User Guide</Link></p>
      </div>
    </div>
  );
}
