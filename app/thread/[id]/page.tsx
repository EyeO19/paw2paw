import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ConversationShell } from "@/app/thread/[id]/conversation-shell";
import { ResourceBridge } from "@/app/thread/[id]/resource-bridge";
import {
  mapRowToMessage,
  sortMessages,
  type ConversationMessage,
} from "@/lib/conversation/message-types";
import { conversationCopy } from "@/lib/copy/conversation";
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
    .select("id, status, topic_tags, writer_id, responder_id")
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
    .select("id, thread_id, sender_id, content, created_at")
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

  return (
    <div className="flex min-h-full flex-col px-4 py-4 md:py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="md:hidden">
          <ResourceBridge />
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_16rem] md:gap-6">
          <ConversationShell
            threadId={id}
            currentUserId={user.id}
            initialMessages={initialMessages}
            initialStatus={conversationStatus}
            topicTags={topicTags}
          />
          <div className="hidden md:block">
            <ResourceBridge />
          </div>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-zinc-900 underline"
        >
          {conversationCopy.thread.homeLink}
        </Link>
      </div>
    </div>
  );
}
