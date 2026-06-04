"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CrisisInterstitial } from "@/app/components/crisis-interstitial";
import { CrisisResourceStrip } from "@/app/components/crisis-resource-strip";
import { flagMessage, sendMessage } from "@/app/actions/conversation";
import { Composer } from "@/app/thread/[id]/composer";
import { Message } from "@/app/thread/[id]/message";
import { useCrisisSendGate } from "@/lib/crisis/use-crisis-send-gate";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
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
  flagged: boolean;
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
  const [toast, setToast] = useState<string | null>(null);
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
      .select("id, thread_id, sender_id, content, created_at, flagged")
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

  const handleSendInternal = async (content: string) => {
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
      flagged: false,
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
      flagged: false,
    };

    setMessages((current) => {
      const withoutTemp = current.filter((message) => message.id !== tempId);
      return removeTempDuplicate(withoutTemp, confirmed);
    });

    trackEvent(ANALYTICS_EVENTS.messageSent, {
      source: "conversation",
      thread_id: threadId,
    });
  };

  const clearComposerRef = useRef<(() => void) | null>(null);

  const {
    requestSend,
    interstitialOpen,
    handleContinue,
    handleExit,
  } = useCrisisSendGate({
    surfaceId: threadId,
    surface: "conversation",
    threadId,
    onProceed: (content) => {
      void handleSendInternal(content);
    },
    onClearComposer: () => clearComposerRef.current?.(),
  });

  const handleReport = async (messageId: string) => {
    const result = await flagMessage({ messageId, threadId });

    if (!result.ok) {
      setToast(result.error);
      return;
    }

    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, flagged: true } : message,
      ),
    );
    setToast(conversationCopy.report.toastSuccess);
    trackEvent(ANALYTICS_EVENTS.messageReported, { thread_id: threadId });
  };

  const handleRetry = (failedMessage: ConversationMessage) => {
    setMessages((current) =>
      current.filter((message) => message.id !== failedMessage.id),
    );
    requestSend(failedMessage.content);
  };

  const isClosed = threadStatus === "closed";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CrisisInterstitial
        open={interstitialOpen}
        onContinue={handleContinue}
        onExit={handleExit}
      />
      {toast ? (
        <div
          className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-800"
          role="status"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-medium underline"
          >
            {conversationCopy.toast.dismiss}
          </button>
        </div>
      ) : null}
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
            canReport
            onRetry={handleRetry}
            onReport={handleReport}
          />
        ))}
      </div>
      {!isClosed ? (
        <>
          <div className="border-t border-zinc-200 px-4 pt-4">
            <CrisisResourceStrip surface="conversation" threadId={threadId} />
          </div>
          <Composer
            disabled={false}
            isSubmitting={isSubmitting}
            onSend={requestSend}
            onRegisterClear={(clear) => {
              clearComposerRef.current = clear;
            }}
          />
        </>
      ) : null}
    </div>
  );
}
