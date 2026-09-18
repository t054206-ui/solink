"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Form";
import { setUserRoleAction } from "../actions";

type Role = "homeowner" | "provider" | "admin";

export function RoleSelect({ userId, role, isSelf }: { userId: string; role: Role; isSelf: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Select aria-label="Role" className="h-9 w-auto text-[13px]" value={role} disabled={pending || isSelf}
        onChange={(e) => { const next = e.target.value as Role; setError(null); start(async () => { const r = await setUserRoleAction({ userId, role: next }); if (!r.ok) setError(r.error); else router.refresh(); }); }}>
        <option value="homeowner">Homeowner</option><option value="provider">Provider</option><option value="admin">Admin</option>
      </Select>
      {isSelf && <p className="mt-0.5 text-[11px] text-fg-muted">Your own role cannot be changed here.</p>}
      {error && <p role="alert" className="mt-0.5 text-[11.5px] text-critical-fg">{error}</p>}
    </div>
  );
}
