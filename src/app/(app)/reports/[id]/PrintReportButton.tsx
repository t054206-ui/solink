"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Same pattern as the passport print button: the browser's own print dialog,
 * which can save to PDF. Solink does not generate a PDF on the server, so it
 * does not pretend to — the print-only CSS lives in the report view.
 */
export function PrintReportButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" aria-hidden /> {label}
    </Button>
  );
}
