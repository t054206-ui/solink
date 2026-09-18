"use client";
import { ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState title="This page could not be loaded">
      <p>{error.message || "An unexpected error occurred."}</p>
      <div className="mt-4 flex justify-center gap-2"><Button variant="outline" onClick={reset}>Try again</Button><Button href="/dashboard">Go to dashboard</Button></div>
    </ErrorState>
  );
}
