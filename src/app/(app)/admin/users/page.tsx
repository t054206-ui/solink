import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { UnavailableState, EmptyState, ErrorState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { listUserProfiles, safe } from "../_lib/data";
import { listManufacturers } from "@/lib/data/repositories";
import { getAdminAccess } from "../_lib/auth";
import { Table, Th, Td } from "../_components/AdminBits";
import { RoleSelect } from "../_components/RoleSelect";
import { ManufacturerLinkSelect } from "../_components/ManufacturerLinkSelect";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function UsersPage() {
  const [users, access, manufacturers] = await Promise.all([listUserProfiles(), getAdminAccess(), safe(() => listManufacturers({ includeArchived: true }), [])]);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Users" description="user_profiles rows: display name, role and the company an account acts for. A manufacturer account manages only the company linked here. Emails live in auth.users and are not listed." />
      <div className="space-y-4">
        <PlaceholderNote k="ADMIN_AUTHENTICATION_PERMISSIONS" />
        {users.mode === "demo" ? (
          <UnavailableState title="User management requires Supabase">There are no real users in demo mode. Connect a Supabase project ([PLACEHOLDER: SUPABASE PROJECT]) to list user_profiles and assign roles.</UnavailableState>
        ) : users.error ? <ErrorState>{users.error}</ErrorState>
        : users.data.length === 0 ? <EmptyState title="No user profiles yet" />
        : (
          <Table caption="User profiles">
            <thead><tr><Th>User id</Th><Th>Name</Th><Th>Role</Th><Th>Manufacturer</Th><Th>Provider company</Th><Th>Created</Th></tr></thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.user_id}>
                  <Td className="font-mono text-[11.5px]">{u.user_id}</Td>
                  <Td className="text-fg">{u.full_name ?? <span className="text-fg-na">—</span>}{u.user_id === access.userId && <Badge tone="brand" className="ml-2">You</Badge>}</Td>
                  <Td><RoleSelect userId={u.user_id} role={u.role} isSelf={u.user_id === access.userId} /></Td>
                  <Td><ManufacturerLinkSelect userId={u.user_id} manufacturerId={u.manufacturer_id} manufacturers={manufacturers.data} /></Td>
                  <Td className="font-mono text-[11.5px]">{u.provider_company_id ?? "—"}</Td>
                  <Td className="whitespace-nowrap">{formatDate(u.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
