"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Form";
import type { Manufacturer } from "@/lib/types";
import { setUserManufacturerAction } from "../actions";

/** Which company a user account acts for. Only meaningful with the manufacturer role; the portal checks both. */
export function ManufacturerLinkSelect({ userId, manufacturerId, manufacturers }: { userId: string; manufacturerId: string | null; manufacturers: Manufacturer[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Select aria-label="Linked manufacturer" className="h-9 w-auto max-w-[200px] text-[13px]" value={manufacturerId ?? ""} disabled={pending}
        onChange={(e) => { const v = e.target.value || null; setError(null); start(async () => { const r = await setUserManufacturerAction({ userId, manufacturerId: v }); if (!r.ok) setError(r.error); else router.refresh(); }); }}>
        <option value="">Not linked</option>
        {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}{m.is_archived ? " (archived)" : ""}</option>)}
      </Select>
      {error && <p role="alert" className="mt-0.5 text-[11.5px] text-critical-fg">{error}</p>}
    </div>
  );
}
