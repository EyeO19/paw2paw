import { dedupeById } from "@/lib/utils/dedupe-by-id";
import { groupBy } from "@/lib/utils/group-by";
import { firstMessagePreview } from "@/lib/utils/message-preview";
import type { SupabaseClient } from "@supabase/supabase-js";

type RespondThreadRow = {
  id: string;
  created_at: string;
  topic_tags: string[] | null;
};

type MessagePreviewRow = {
  thread_id: string;
  content: string;
  created_at: string;
};

export type RespondThreadWithMessages = RespondThreadRow & {
  messages: MessagePreviewRow[];
};

export async function loadRespondThreads(
  supabase: SupabaseClient,
  topicTags: string[],
  excludeWriterId: string,
  limit = 20,
): Promise<{ threads: RespondThreadWithMessages[]; error: Error | null }> {
  const { data: threadRows, error: threadError } = await supabase
    .from("threads")
    .select("id, created_at, topic_tags")
    .eq("status", "pending")
    .neq("writer_id", excludeWriterId)
    .overlaps("topic_tags", topicTags)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (threadError) {
    return { threads: [], error: new Error(threadError.message) };
  }

  const uniqueThreads = dedupeById((threadRows ?? []) as RespondThreadRow[]);
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

export function respondPreview(messages: MessagePreviewRow[]): string {
  return firstMessagePreview(messages);
}
