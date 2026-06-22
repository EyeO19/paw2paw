import { redirect } from "next/navigation";

import { InboxList, type InboxThreadItem } from "@/app/inbox/inbox-list";
import { GlassPage } from "@/app/components/glass/glass-page";
import { GlassPanel } from "@/app/components/glass/glass-panel";
import { PageTitle, TextLink } from "@/app/components/ui/page-shell";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { canCompose, getReciprocityStatus } from "@/lib/auth/reciprocity";
import {
  inboxPreview,
  lastActivityAt,
  loadParticipantThreads,
} from "@/lib/inbox/load-participant-threads";
import { inboxCopy } from "@/lib/copy/inbox";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { createClient } from "@/lib/supabase/server";

function threadHref(
  thread: {
    id: string;
    status: "pending" | "matched" | "closed";
    writer_id: string;
  },
  userId: string,
): string {
  if (thread.status === "pending" && thread.writer_id === userId) {
    return `/thread/${thread.id}/pending`;
  }

  return `/thread/${thread.id}`;
}

export default async function InboxPage() {
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

  const { threads: rows, error } = await loadParticipantThreads(
    supabase,
    user.id,
  );

  if (error) {
    throw new Error(inboxCopy.errors.loadFailed);
  }

  const reciprocity = await getReciprocityStatus(supabase, user.id);
  const showNewConversation = canCompose(reciprocity);

  const threads: InboxThreadItem[] = rows
    .map((row) => {
      const role: InboxThreadItem["role"] =
        row.writer_id === user.id ? "writer" : "responder";
      const activityAt = lastActivityAt(row, row.messages);

      return {
        id: row.id,
        status: row.status,
        role,
        topicTags: row.topic_tags ?? [],
        preview: inboxPreview(row.messages),
        updatedAgo: formatRelativeTime(activityAt),
        href: threadHref(row, user.id),
        sortKey: new Date(activityAt).getTime(),
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ sortKey: _sortKey, ...item }) => item);

  const started = threads.filter((thread) => thread.role === "writer");
  const supporting = threads.filter((thread) => thread.role === "responder");

  return (
    <GlassPage width="lg">
      <PageTitle>{inboxCopy.inbox.title}</PageTitle>
      <GlassPanel className="flex flex-col gap-6">
        <InboxList started={started} supporting={supporting} />
        {showNewConversation ? (
          <div className="border-t border-border-subtle/60 pt-4 text-center backdrop-blur-sm">
            <TextLink href="/compose">{inboxCopy.inbox.newConversationLink}</TextLink>
          </div>
        ) : null}
      </GlassPanel>
    </GlassPage>
  );
}
