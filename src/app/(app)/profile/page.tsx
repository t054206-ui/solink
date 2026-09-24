import { getProfile } from "@/lib/data/repositories";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Solar Profile" };

export default async function ProfilePage() {
  const { data: profile, mode } = await getProfile();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <ProfileForm
        profile={profile}
        mode={mode}
        heading={{
          eyebrow: "Plan · Step 1",
          title: "Solar Profile",
          description: "Tell Solink about your home, roof and electricity use. Only your consumption (or bill) and roof area are required; everything else sharpens the analysis.",
        }}
      />
    </div>
  );
}
