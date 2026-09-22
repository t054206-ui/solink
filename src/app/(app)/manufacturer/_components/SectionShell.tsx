import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { NotBuiltNote } from "@/components/ui/NotBuilt";

/**
 * A manufacturer section that exists in the structure before its data does.
 * It says what it will show, that there is nothing yet, and what is needed,
 * in that order. No chart, no sample number.
 */
export function SectionShell({ eyebrow = "Manufacturer", title, description, emptyTitle, emptyBody, needs, children }: {
  eyebrow?: string; title: string; description: string; emptyTitle: string; emptyBody: ReactNode; needs: { title: string; body: ReactNode }; children?: ReactNode;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Card>
        <CardBody className="space-y-4">
          <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>
          <NotBuiltNote title={needs.title}>{needs.body}</NotBuiltNote>
          {children}
        </CardBody>
      </Card>
    </>
  );
}
