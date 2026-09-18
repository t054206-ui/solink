import { DataBadge } from "@/components/ui/DataBadge";
import { DATA_CLASS_DESCRIPTION, type DataClass } from "@/lib/classification";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

const ORDER: DataClass[] = ["source", "calculated", "estimated", "user", "unavailable", "demo"];

/** Legend explaining the data-classification badges used on every metric. */
export function DataLegend({ classes = ORDER, compact = false }: { classes?: DataClass[]; compact?: boolean }) {
  const body = (
    <ul className="grid gap-2 sm:grid-cols-2">
      {classes.map((c) => (
        <li key={c} className="flex items-start gap-2">
          <DataBadge cls={c} compact className="mt-0.5 shrink-0" />
          <span className="text-[12.5px] leading-snug text-fg-secondary">{DATA_CLASS_DESCRIPTION[c]}</span>
        </li>
      ))}
    </ul>
  );
  if (compact) return body;
  return (
    <Card>
      <CardHeader title="How to read these numbers" subtitle="Every figure carries a label telling you where it came from." />
      <CardBody>{body}</CardBody>
    </Card>
  );
}
