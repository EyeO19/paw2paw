import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { authCopy } from "@/lib/copy/auth";

export async function redirectAfterAuthenticatedSession(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<never> {
  const profileResult = await ensureUserProfile(supabase, authUserId);

  if (!profileResult.ok) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent(authCopy.errors.profileSetup)}`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("topic_tags")
    .eq("id", authUserId)
    .single();

  redirect(needsOnboarding(profile) ? "/onboarding" : "/");
}
