import { redirect } from "next/navigation";

import { OnboardingForm } from "@/app/onboarding/onboarding-form";
import {
  PageDescription,
  PageShell,
  PageTitle,
} from "@/app/components/ui/page-shell";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { authCopy } from "@/lib/copy/auth";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profileResult = await ensureUserProfile(supabase, user.id);
  if (!profileResult.ok) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("topic_tags")
    .eq("id", user.id)
    .single();

  if (!needsOnboarding(profile)) {
    redirect("/");
  }

  return (
    <PageShell>
      <div className="flex flex-col gap-2 text-center">
        <PageTitle>{authCopy.onboarding.title}</PageTitle>
        <PageDescription>{authCopy.onboarding.description}</PageDescription>
      </div>
      <OnboardingForm />
    </PageShell>
  );
}
