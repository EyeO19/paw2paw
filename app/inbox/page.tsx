import Link from "next/link";
import { redirect } from "next/navigation";

import { InboxList, type InboxThreadItem } from "@/app/inbox/inbox-list";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { inboxCopy } from "@/lib/copy/inbox";
import { firstMessagePreview } from "@/lib/utils/message-preview";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { createClient } from "@/lib/supabase/server";

type ThreadRow = {
  id: string;
  status: "pending" | "matched" | "closed";
  created_at: string;
  topic_tags: string[] | null;
  writer_id: string;
  responder_id: string | null;
  messages: { content: string; created_at: string }[] | null;
};

function threadHref(
  thread: Pick<ThreadRow, "id" | "status" | "writer_id">,
  userId: string,
): string {
  if (thread.status === "pending" && thread.writer_id === userId) {
    return `/thread/${thread.id}/pending`;
  }

  return `/thread/${thread.id}`;
}

function lastActivityAt(
  thread: Pick<ThreadRow, "created_at">,
  messages: ThreadRow["messages"],
): string {
  const messageTimes = (messages ?? []).map((m) =>
    new Date(m.created_at).getTime(),
  );
  const latestMessage = messageTimes.length > 0 ? Math.max(...messageTimes) : 0;
  const threadTime = new Date(thread.created_at).getTime();

  return new Date(Math.max(threadTime, latestMessage)).toISOString();
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

  const { data: rows, error } = await supabase
    .from("threads")
    .select(
      "id, status, created_at, topic_tags, writer_id, responder_id, messages(content, created_at)",
    )
    .or(`writer_id.eq.${user.id},responder_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(inboxCopy.errors.loadFailed);
  }

  const threads: InboxThreadItem[] = ((rows ?? []) as ThreadRow[])
    .map((row) => {
      const role: InboxThreadItem["role"] =
        row.writer_id === user.id ? "writer" : "responder";
      const activityAt = lastActivityAt(row, row.messages);

      return {
        id: row.id,
        status: row.status,
        role,
        topicTags: row.topic_tags ?? [],
        preview: firstMessagePreview(row.messages),
        updatedAgo: formatRelativeTime(activityAt),
        href: threadHref(row, user.id),
        sortKey: new Date(activityAt).getTime(),
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ sortKey: _sortKey, ...item }) => item);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {inboxCopy.inbox.title}
        </h1>
        <InboxList threads={threads} />
        <div className="flex flex-col items-center gap-2 text-sm">
          <Link href="/compose" className="font-medium text-zinc-900 underline">
            {inboxCopy.inbox.newConversationLink}
          </Link>
          <Link href="/" className="text-zinc-600 underline">
            {inboxCopy.inbox.homeLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
