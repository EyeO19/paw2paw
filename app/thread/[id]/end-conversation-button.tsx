"use client";

import { useState, useTransition } from "react";

import { endConversation } from "@/app/actions/conversation";
import { conversationCopy } from "@/lib/copy/conversation";

type EndConversationButtonProps = {
  threadId: string;
  onEnded: () => void;
};

export function EndConversationButton({
  threadId,
  onEnded,
}: EndConversationButtonProps) {
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    const confirmed = window.confirm(conversationCopy.thread.confirmEnd);
    if (!confirmed) {
      return;
    }

    setError(undefined);
    startTransition(async () => {
      const result = await endConversation({ threadId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onEnded();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 disabled:opacity-60"
      >
        {isPending
          ? conversationCopy.thread.ending
          : conversationCopy.thread.endConversation}
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
