"use client";
import { ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState title="This page could not be loaded">
      <p>Something went wrong on our side while loading this page. Trying again usually works. Your data has not been changed.</p>
      {error.digest && <p className="mt-2 font-mono text-[11.5px] text-fg-muted">Reference {error.digest}</p>}
      <div className="mt-4 flex justify-center gap-2"><Button variant="outline" onClick={reset}>Try again</Button><Button href="/dashboard">Go to dashboard</Button></div>
    </ErrorState>
  );
}
