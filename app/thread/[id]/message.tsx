"use client";

import { useState } from "react";

import { conversationCopy } from "@/lib/copy/conversation";
import type { ConversationMessage } from "@/lib/conversation/message-types";
import { formatRelativeTime } from "@/lib/utils/relative-time";

type MessageProps = {
  message: ConversationMessage;
  isMine: boolean;
  canReport: boolean;
  onRetry?: (message: ConversationMessage) => void;
  onReport?: (messageId: string) => Promise<void>;
};

export function Message({
  message,
  isMine,
  canReport,
  onRetry,
  onReport,
}: MessageProps) {
  const [isReporting, setIsReporting] = useState(false);
  const isSending = message.deliveryStatus === "sending";
  const isFailed = message.deliveryStatus === "failed";
  const isTemp = message.id.startsWith("tmp-");
  const showReport =
    canReport &&
    !isTemp &&
    !isSending &&
    !isFailed &&
    !message.flagged &&
    onReport;

  const handleReport = async () => {
    if (!onReport || isReporting) {
      return;
    }
    setIsReporting(true);
    await onReport(message.id);
    setIsReporting(false);
  };

  return (
    <div
      className={`flex w-full ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
          isMine
            ? "bg-zinc-900 text-white"
            : "border border-zinc-200 bg-white text-zinc-900"
        } ${isSending ? "opacity-70" : ""}`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${
            isMine ? "text-zinc-300" : "text-zinc-500"
          }`}
        >
          <span>
            {isSending
              ? conversationCopy.message.sending
              : formatRelativeTime(message.createdAt)}
          </span>
          {message.flagged ? (
            <span>{conversationCopy.message.reported}</span>
          ) : null}
          {isFailed ? (
            <>
              <span>{conversationCopy.message.failed}</span>
              {onRetry ? (
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  className="font-medium underline"
                >
                  {conversationCopy.message.retry}
                </button>
              ) : null}
            </>
          ) : null}
          {showReport ? (
            <button
              type="button"
              onClick={() => {
                void handleReport();
              }}
              disabled={isReporting}
              className="font-medium underline disabled:opacity-60"
            >
              {isReporting
                ? conversationCopy.message.reporting
                : conversationCopy.message.report}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
