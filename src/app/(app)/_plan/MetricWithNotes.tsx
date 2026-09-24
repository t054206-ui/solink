import type { ReactNode } from "react";
import { Metric } from "@/components/ui/Metric";
import type { Classified } from "@/lib/classification";
import { cn } from "@/lib/utils";

/**
 * A <Metric> followed by the formula / assumption notes that calculations.ts
 * attaches to every result, so users can see exactly how a number was made.
 */
export function MetricWithNotes({ label, term, data, format, unit, className, extra, energy }: {
  label: ReactNode; term?: string; data: Classified; format?: (v: number) => string; unit?: string; className?: string; extra?: ReactNode; energy?: boolean;
}) {
  const notes = data.notes ?? [];
  return (
    <div className={cn("flex flex-col gap-1.5 min-w-0", className)}>
      <Metric label={label} term={term} data={data} format={format} unit={unit} energy={energy} />
      {(notes.length > 0 || extra) && (
        <div className="px-1 text-[11.5px] leading-snug text-fg-muted">
          {notes.map((n, i) => <div key={i} className="break-words">· {n}</div>)}
          {extra}
        </div>
      )}
    </div>
  );
}
