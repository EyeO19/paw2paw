import { redirect } from "next/navigation";

import { OptInPrompt } from "@/app/respond/opt-in-prompt";
import { RespondList, type RespondThreadItem } from "@/app/respond/respond-list";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { respondCopy } from "@/lib/copy/respond";
import { firstMessagePreview } from "@/lib/utils/message-preview";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { createClient } from "@/lib/supabase/server";

type ThreadRow = {
  id: string;
  created_at: string;
  topic_tags: string[] | null;
  messages: { content: string; created_at: string }[] | null;
};

export default async function RespondPage() {
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

  if (!profile?.opt_in_responder) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <OptInPrompt />
      </div>
    );
  }

  const userTopicTags = profile.topic_tags ?? [];

  const { data: rows, error } = await supabase
    .from("threads")
    .select("id, created_at, topic_tags, messages(content, created_at)")
    .eq("status", "pending")
    .neq("writer_id", user.id)
    .overlaps("topic_tags", userTopicTags)
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    throw new Error("Failed to load open conversations");
  }

  const threads: RespondThreadItem[] = ((rows ?? []) as ThreadRow[]).map(
    (row) => ({
      id: row.id,
      topicTags: row.topic_tags ?? [],
      preview: firstMessagePreview(row.messages),
      createdAgo: formatRelativeTime(row.created_at),
    }),
  );

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {respondCopy.respond.title}
        </h1>
        <RespondList threads={threads} />
      </div>
    </div>
  );
}
