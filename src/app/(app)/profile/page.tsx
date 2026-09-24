import { getProfile } from "@/lib/data/repositories";
import { getPlatformSettings } from "@/lib/data/settings";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Solar Profile" };

export default async function ProfilePage() {
  const [{ data: profile, mode }, settings] = await Promise.all([getProfile(), getPlatformSettings()]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <ProfileForm
        profile={profile}
        mode={mode}
        tariff={settings.electricity_tariff_per_kwh}
        heading={{
          eyebrow: "Plan · Step 1",
          title: "Solar Profile",
          description: "Tell Solink about your home, roof and electricity use. Only your consumption (or bill) and roof area are required; everything else sharpens the analysis.",
        }}
      />
    </div>
  );
}
