"use client";
import { ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";

/** Friendly failure for the public pages: what happened in one line, a retry, a way home. */
export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <ErrorState title="This page could not be loaded">
        <p>Something went wrong on our side. Trying again usually works; if it keeps happening, the rest of Solink is still available from the home page.</p>
        {error.digest && <p className="mt-2 font-mono text-[11.5px] text-fg-muted">Reference {error.digest}</p>}
        <div className="mt-4 flex justify-center gap-2"><Button variant="outline" onClick={reset}>Try again</Button><Button href="/">Home</Button></div>
      </ErrorState>
    </div>
  );
}
