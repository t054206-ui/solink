"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Uses the browser's print dialog (save as PDF). Print-only CSS lives in the passport page. */
export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" aria-hidden /> Download / print passport
    </Button>
  );
}
