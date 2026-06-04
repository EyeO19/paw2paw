"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { sendMessage } from "@/app/actions/conversation";
import { Composer } from "@/app/thread/[id]/composer";
import { Message } from "@/app/thread/[id]/message";
import {
  mapRowToMessage,
  removeTempDuplicate,
  sortMessages,
  upsertMessages,
  type ConversationMessage,
} from "@/lib/conversation/message-types";
import { conversationCopy } from "@/lib/copy/conversation";
import { createClient } from "@/lib/supabase/client";
import { isNearBottom, scrollToBottom } from "@/lib/utils/scroll-helpers";

type ConversationViewProps = {
  threadId: string;
  currentUserId: string;
  initialMessages: ConversationMessage[];
  threadStatus: "matched" | "closed";
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export function ConversationView({
  threadId,
  currentUserId,
  initialMessages,
  threadStatus,
}: ConversationViewProps) {
  const [messages, setMessages] = useState(() =>
    [...initialMessages].sort(sortMessages),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasConnectedRef = useRef(false);
  const supabaseRef = useRef(createClient());

  const maybeScrollToBottom = useCallback((force = false) => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    if (force || isNearBottom(element)) {
      scrollToBottom(element);
    }
  }, []);

  const fetchAndMergeMessages = useCallback(async () => {
    const { data, error } = await supabaseRef.current
      .from("messages")
      .select("id, thread_id, sender_id, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error || !data) {
      return;
    }

    const incoming = (data as MessageRow[]).map(mapRowToMessage);
    setMessages((current) => {
      const realIds = new Set(
        incoming.map((message) => message.id),
      );
      const pendingTemps = current.filter(
        (message) =>
          message.id.startsWith("tmp-") && !realIds.has(message.id),
      );
      return upsertMessages(pendingTemps, incoming);
    });
  }, [threadId]);

  useEffect(() => {
    scrollToBottom(scrollRef.current);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channelName = `conversation:${threadId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          const incoming = mapRowToMessage(row);

          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current;
            }
            return removeTempDuplicate(current, incoming);
          });
          maybeScrollToBottom();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (wasConnectedRef.current) {
            void fetchAndMergeMessages();
          }
          wasConnectedRef.current = true;
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, fetchAndMergeMessages, maybeScrollToBottom]);

  useEffect(() => {
    maybeScrollToBottom();
  }, [messages, maybeScrollToBottom]);

  const handleSend = async (content: string) => {
    if (threadStatus !== "matched" || isSubmitting) {
      return;
    }

    const tempId = `tmp-${crypto.randomUUID()}`;
    const optimistic: ConversationMessage = {
      id: tempId,
      threadId,
      senderId: currentUserId,
      content,
      createdAt: new Date().toISOString(),
      deliveryStatus: "sending",
    };

    setMessages((current) => upsertMessages(current, [optimistic]));
    maybeScrollToBottom(true);
    setIsSubmitting(true);

    const result = await sendMessage({ threadId, content });

    setIsSubmitting(false);

    if (!result.ok) {
      setMessages((current) =>
        current.map((message) =>
          message.id === tempId
            ? { ...message, deliveryStatus: "failed" }
            : message,
        ),
      );
      return;
    }

    const confirmed: ConversationMessage = {
      id: result.messageId,
      threadId,
      senderId: currentUserId,
      content,
      createdAt: optimistic.createdAt,
      deliveryStatus: "sent",
    };

    setMessages((current) => {
      const withoutTemp = current.filter((message) => message.id !== tempId);
      return removeTempDuplicate(withoutTemp, confirmed);
    });
  };

  const handleRetry = (failedMessage: ConversationMessage) => {
    setMessages((current) =>
      current.filter((message) => message.id !== failedMessage.id),
    );
    void handleSend(failedMessage.content);
  };

  const isClosed = threadStatus === "closed";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isClosed ? (
        <div
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {conversationCopy.thread.endedBanner}
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            isMine={message.senderId === currentUserId}
            onRetry={handleRetry}
          />
        ))}
      </div>
      {!isClosed ? (
        <Composer
          disabled={false}
          isSubmitting={isSubmitting}
          onSend={(content) => {
            void handleSend(content);
          }}
        />
      ) : null}
    </div>
  );
}
