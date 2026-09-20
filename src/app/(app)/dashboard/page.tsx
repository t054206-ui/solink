import { RoleSwitcher } from "./_components/RoleSwitcher";
import AdminDashboard from "./_role/AdminDashboard";
import CompanyDashboard from "./_role/CompanyDashboard";
import HomeownerDashboard from "./_role/HomeownerDashboard";
import ManufacturerDashboard from "./_role/ManufacturerDashboard";
import { DEFAULT_ROLE, isRole, type Role } from "@/lib/roles";
import { getDataMode } from "@/lib/data/mode";
import { getCurrentRole } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

/**
 * One route, four dashboards.
 *
 * In Supabase mode the role is the signed-in user's user_profiles.role and
 * nothing else — a ?as= query string is ignored, and there is no switcher. In
 * demo mode (no Supabase) the role rides in ?as= and the switcher sets it, so
 * each dashboard stays an async server component that loads only its own data.
 *
 * Landlord is not in this list on purpose — the owner confirmed a landlord is
 * a homeowner, so they share a screen.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const demo = getDataMode() === "demo";
  let role: Role = DEFAULT_ROLE;
  if (demo) {
    const params = await searchParams;
    const raw = Array.isArray(params.as) ? params.as[0] : params.as;
    role = isRole(raw) ? raw : DEFAULT_ROLE;
  } else {
    role = (await getCurrentRole()) ?? DEFAULT_ROLE;
  }

  return (
    <>
      {demo && <RoleSwitcher active={role} />}
      <div className={demo ? "mt-[var(--grid-gap)]" : ""}>
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
