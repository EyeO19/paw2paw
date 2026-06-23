import { redirect } from "next/navigation";

import {
  RespondOpenList,
  type RespondOpenItem,
} from "@/app/respond/respond-open-list";
import { PageShell, PageTitle } from "@/app/components/ui/page-shell";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { getActiveResponderThreadId } from "@/lib/inbox/get-active-responder-thread";
import {
  loadOpenRespondThreads,
  respondPreview,
  type RespondThreadWithMessages,
} from "@/lib/inbox/load-respond-threads";
import { respondCopy } from "@/lib/copy/respond";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function toOpenItem(row: RespondThreadWithMessages): RespondOpenItem {
  return {
    id: row.id,
    topicTags: row.topic_tags ?? [],
    preview: respondPreview(row.messages),
    createdAgo: formatRelativeTime(row.created_at),
  };
}

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
    .select("topic_tags")
    .eq("id", user.id)
    .single();

  if (needsOnboarding(profile)) {
    redirect("/onboarding");
  }

  const activeThreadId = await getActiveResponderThreadId(supabase, user.id);
  if (activeThreadId) {
    redirect(`/thread/${activeThreadId}`);
  }

  const { threads, error } = await loadOpenRespondThreads(supabase, user.id, 50);

  if (error) {
    throw new Error("Failed to load open conversations");
  }

  const openItems = threads.map(toOpenItem);

  return (
    <PageShell width="lg">
      <PageTitle>{respondCopy.respond.title}</PageTitle>
      {openItems.length === 0 ? (
        <p className="text-center text-sm text-ink-secondary">
          {respondCopy.respond.empty}
        </p>
      ) : (
        <RespondOpenList items={openItems} />
      )}
    </PageShell>
  );
}
