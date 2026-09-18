import { PageHeader } from "@/components/layout/PageHeader";
import { getProfile } from "@/lib/data/repositories";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Solar Profile" };

export default async function ProfilePage() {
  const { data: profile, mode } = await getProfile();

  // Existing roof photo: private bucket, so mint a short-lived signed URL for the owner (RLS: own folder only).
  let existingPhotoUrl: string | null = null;
  if (mode === "supabase" && profile?.roof_photo_path) {
    const c = await createClient();
    const { data } = (await c?.storage.from("roof-photos").createSignedUrl(profile.roof_photo_path, 60 * 60)) ?? { data: null };
    existingPhotoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        eyebrow="Plan · Step 1"
        title="Solar Profile"
        description="Tell Solink about your home, roof and electricity use. Only your consumption (or bill) and roof area are required; everything else sharpens the analysis."
      />
      <ProfileForm profile={profile} mode={mode} existingPhotoUrl={existingPhotoUrl} />
    </div>
  );
}
