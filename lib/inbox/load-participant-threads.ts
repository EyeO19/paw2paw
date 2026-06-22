import { dedupeById } from "@/lib/utils/dedupe-by-id";
import { groupBy } from "@/lib/utils/group-by";
import { firstMessagePreview } from "@/lib/utils/message-preview";
import type { SupabaseClient } from "@supabase/supabase-js";

type ThreadRow = {
  id: string;
  status: "pending" | "matched" | "closed";
  created_at: string;
  topic_tags: string[] | null;
  writer_id: string;
  responder_id: string | null;
};

type MessagePreviewRow = {
  thread_id: string;
  content: string;
  created_at: string;
};

export type InboxThreadRow = ThreadRow & {
  messages: MessagePreviewRow[];
};

export async function loadParticipantThreads(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<{ threads: InboxThreadRow[]; error: Error | null }> {
  const { data: threadRows, error: threadError } = await supabase
    .from("threads")
    .select("id, status, created_at, topic_tags, writer_id, responder_id")
    .or(`writer_id.eq.${userId},responder_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (threadError) {
    return { threads: [], error: new Error(threadError.message) };
  }

  const uniqueThreads = dedupeById((threadRows ?? []) as ThreadRow[]);
  if (uniqueThreads.length === 0) {
    return { threads: [], error: null };
  }

  const threadIds = uniqueThreads.map((thread) => thread.id);
  const { data: messageRows, error: messageError } = await supabase
    .from("messages")
    .select("thread_id, content, created_at")
    .in("thread_id", threadIds);

  if (messageError) {
    return { threads: [], error: new Error(messageError.message) };
  }

  const messagesByThread = groupBy(
    (messageRows ?? []) as MessagePreviewRow[],
    (message) => message.thread_id,
  );

  return {
    threads: uniqueThreads.map((thread) => ({
      ...thread,
      messages: messagesByThread.get(thread.id) ?? [],
    })),
    error: null,
  };
}

export function lastActivityAt(
  thread: Pick<ThreadRow, "created_at">,
  messages: MessagePreviewRow[],
): string {
  const messageTimes = messages.map((message) =>
    new Date(message.created_at).getTime(),
  );
  const latestMessage =
    messageTimes.length > 0 ? Math.max(...messageTimes) : 0;
  const threadTime = new Date(thread.created_at).getTime();

  return new Date(Math.max(threadTime, latestMessage)).toISOString();
}

export function inboxPreview(messages: MessagePreviewRow[]): string {
  return firstMessagePreview(messages);
}
