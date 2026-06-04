"use client";

import { useState } from "react";

import { ConversationView } from "@/app/thread/[id]/conversation-view";
import { EndConversationButton } from "@/app/thread/[id]/end-conversation-button";
import { formatTopicTagLabel } from "@/lib/constants/format-topic-tag";
import type { ConversationMessage } from "@/lib/conversation/message-types";

type ConversationShellProps = {
  threadId: string;
  currentUserId: string;
  initialMessages: ConversationMessage[];
  initialStatus: "matched" | "closed";
  topicTags: string[];
};

export function ConversationShell({
  threadId,
  currentUserId,
  initialMessages,
  initialStatus,
  topicTags,
}: ConversationShellProps) {
  const [threadStatus, setThreadStatus] = useState(initialStatus);

  return (
    <div className="flex min-h-[70dvh] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white md:min-h-[75dvh]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {topicTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-700"
            >
              {formatTopicTagLabel(tag)}
            </span>
          ))}
        </div>
        {threadStatus === "matched" ? (
          <EndConversationButton
            threadId={threadId}
            onEnded={() => setThreadStatus("closed")}
          />
        ) : null}
      </header>
      <ConversationView
        threadId={threadId}
        currentUserId={currentUserId}
        initialMessages={initialMessages}
        threadStatus={threadStatus}
      />
    </div>
  );
}
