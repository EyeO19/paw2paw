import { notFound, redirect } from "next/navigation";

import { ConversationShell } from "@/app/thread/[id]/conversation-shell";
import { ResourceBridge } from "@/app/thread/[id]/resource-bridge";
import { AmbientBackground } from "@/app/components/glass/ambient-background";
import { getReciprocityStatus } from "@/lib/auth/reciprocity";
import {
  mapRowToMessage,
  sortMessages,
  type ConversationMessage,
} from "@/lib/conversation/message-types";
import { mapWellbeingRow } from "@/lib/conversation/wellbeing";
import { createClient } from "@/lib/supabase/server";

type ThreadPageProps = {
  params: Promise<{ id: string }>;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  flagged: boolean;
};

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: thread } = await supabase
    .from("threads")
    .select(
      "id, status, topic_tags, writer_id, responder_id, wellbeing_prompt_sent_at, wellbeing_prompt_sender_id, wellbeing_response, wellbeing_responded_by",
    )
    .eq("id", id)
    .maybeSingle();

  if (!thread) {
    notFound();
  }

  if (thread.status === "pending") {
    if (thread.writer_id === user.id) {
      redirect(`/thread/${id}/pending`);
    }
    redirect("/respond");
  }

  if (thread.status !== "matched" && thread.status !== "closed") {
    redirect("/");
  }

  const { data: messageRows } = await supabase
    .from("messages")
    .select("id, thread_id, sender_id, content, created_at, flagged")
    .eq("thread_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const initialMessages: ConversationMessage[] = (
    (messageRows ?? []) as MessageRow[]
  )
    .map(mapRowToMessage)
    .sort(sortMessages);

  const topicTags: string[] = thread.topic_tags ?? [];
  const conversationStatus = thread.status as "matched" | "closed";
  const reciprocity = await getReciprocityStatus(supabase, user.id);
  const wellbeing = mapWellbeingRow(thread);

  return (
    <div className="relative isolate flex min-h-[calc(100dvh-4.5rem)] flex-col items-center justify-center px-4 py-6">
      <AmbientBackground />
      <div className="relative z-10 flex w-full max-w-3xl flex-col gap-4">
        <ConversationShell
          threadId={id}
          currentUserId={user.id}
          initialMessages={initialMessages}
          initialStatus={conversationStatus}
          topicTags={topicTags}
          requiresReciprocity={reciprocity.requiresReciprocity}
          initialWellbeing={wellbeing}
        />
        <ResourceBridge />
      </div>
    </div>
  );
}
