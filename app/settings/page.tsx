import Link from "next/link";
import { redirect } from "next/navigation";

import { SettingsForm } from "@/app/settings/settings-form";
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
    .select("topic_tags, opt_in_responder")
    .eq("id", user.id)
    .single();

  if (needsOnboarding(profile)) {
    redirect("/onboarding");
  }

  const selectedTags = parseTopicTags(profile?.topic_tags ?? null);
  const optInResponder = Boolean(profile?.opt_in_responder);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">
            {settingsCopy.title}
          </h1>
          <p className="text-sm text-zinc-600">{settingsCopy.description}</p>
        </div>
        <SettingsForm
          selectedTags={selectedTags}
          optInResponder={optInResponder}
          returnTo={returnTo}
        />
        <Link
          href="/"
          className="text-center text-sm font-medium text-zinc-900 underline"
        >
          {settingsCopy.homeLink}
        </Link>
      </div>
    </div>
  );
}
