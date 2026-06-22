import { redirect } from "next/navigation";

import { SettingsForm } from "@/app/settings/settings-form";
import {
  PageDescription,
  PageShell,
  PageTitle,
} from "@/app/components/ui/page-shell";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { safeInternalPath } from "@/lib/auth/safe-internal-path";
import { needsOnboarding } from "@/lib/auth/onboarding";
import type { TopicTag } from "@/lib/constants/topic-tags";
import { TOPIC_TAGS } from "@/lib/constants/topic-tags";
import { settingsCopy } from "@/lib/copy/settings";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  searchParams: Promise<{ from?: string }>;
};

function parseTopicTags(tags: string[] | null): TopicTag[] {
  const allowed = new Set<string>(TOPIC_TAGS);
  return (tags ?? []).filter((t): t is TopicTag => allowed.has(t));
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const { from } = await searchParams;
  const returnTo = safeInternalPath(from ?? null);

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

  if (needsOnboarding(profile)) {
    redirect("/onboarding");
  }

  const selectedTags = parseTopicTags(profile?.topic_tags ?? null);

  return (
    <PageShell>
      <div className="flex flex-col gap-2 text-center">
        <PageTitle>{settingsCopy.title}</PageTitle>
        <PageDescription>{settingsCopy.description}</PageDescription>
      </div>
      <SettingsForm selectedTags={selectedTags} returnTo={returnTo} />
    </PageShell>
  );
}
