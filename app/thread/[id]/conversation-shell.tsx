"use client";

import { useState } from "react";

import { ConversationView } from "@/app/thread/[id]/conversation-view";
import { EndConversationButton } from "@/app/thread/[id]/end-conversation-button";
import { TopicBadge } from "@/app/components/ui/topic-badge";
import type { ConversationMessage } from "@/lib/conversation/message-types";
import type { WellbeingState } from "@/lib/conversation/wellbeing";

type ConversationShellProps = {
  threadId: string;
  currentUserId: string;
  initialMessages: ConversationMessage[];
  initialStatus: "matched" | "closed";
  topicTags: string[];
  requiresReciprocity: boolean;
  initialWellbeing: WellbeingState;
};

export function ConversationShell({
  threadId,
  currentUserId,
  initialMessages,
  initialStatus,
  topicTags,
  requiresReciprocity,
  initialWellbeing,
}: ConversationShellProps) {
  const [threadStatus, setThreadStatus] = useState(initialStatus);

  return (
    <div
      className="flex h-[min(82dvh,calc(100dvh-8rem))] w-full flex-col rounded-md border border-white/60 bg-surface shadow-card"
    >
      <header
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-surface-subtle px-4 py-3"
      >
        <div className="flex flex-wrap gap-2">
          {topicTags.map((tag) => (
            <TopicBadge key={tag} tag={tag} />
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
        requiresReciprocity={requiresReciprocity}
        initialWellbeing={initialWellbeing}
        onReopened={() => setThreadStatus("matched")}
      />
    </div>
  );
}
