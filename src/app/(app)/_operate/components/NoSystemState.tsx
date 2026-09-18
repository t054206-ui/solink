import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

/** Shown by Operate pages when the homeowner has no solar system on record yet. */
export function NoSystemState({ feature = "This page" }: { feature?: string }) {
  return (
    <EmptyState title="No solar system on record yet">
      <p>{feature} works with an installed system. Design one, or record a purchase and installation, and it will appear here.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button href="/designer" size="sm">Open Solar Designer</Button>
        <Button href="/purchase" size="sm" variant="outline">Purchase &amp; Install</Button>
      </div>
    </EmptyState>
  );
}
