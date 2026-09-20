import { RoleSwitcher } from "./_components/RoleSwitcher";
import AdminDashboard from "./_role/AdminDashboard";
import CompanyDashboard from "./_role/CompanyDashboard";
import HomeownerDashboard from "./_role/HomeownerDashboard";
import ManufacturerDashboard from "./_role/ManufacturerDashboard";
import { DEFAULT_ROLE, isRole, type Role } from "@/lib/roles";

export const metadata = { title: "Dashboard" };

/**
 * One route, four dashboards.
 *
 * The role rides in the query string rather than in client state, so each
 * dashboard stays an async server component that loads only its own data. In
 * demo mode the switcher below sets it; when Supabase is connected the role
 * comes from user_profiles and the switcher goes away.
 *
 * Landlord is not in this list on purpose — the owner confirmed a landlord is
 * a homeowner, so they share a screen.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  const raw = Array.isArray(params.as) ? params.as[0] : params.as;
  const role: Role = isRole(raw) ? raw : DEFAULT_ROLE;

  return (
    <>
      <RoleSwitcher active={role} />
      <div className="mt-[var(--grid-gap)]">
        {role === "manufacturer" ? (
          <ManufacturerDashboard />
        ) : role === "company" ? (
          <CompanyDashboard />
        ) : role === "admin" ? (
          <AdminDashboard />
        ) : (
          <HomeownerDashboard />
        )}
      </div>
    </>
  );
}
