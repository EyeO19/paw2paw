"use client";

import { useState, useTransition } from "react";

import { endConversation } from "@/app/actions/conversation";
import { Button } from "@/app/components/ui/button";
import { Dialog } from "@/app/components/ui/dialog";
import { FieldError } from "@/app/components/ui/input";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import { conversationCopy } from "@/lib/copy/conversation";

type EndConversationButtonProps = {
  threadId: string;
  onEnded: () => void;
};

export function EndConversationButton({
  threadId,
  onEnded,
}: EndConversationButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(undefined);
    startTransition(async () => {
      const result = await endConversation({ threadId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      trackEvent(ANALYTICS_EVENTS.conversationEnded, { thread_id: threadId });
      setOpen(false);
      onEnded();
    });
  };

  return (
    <>
      <div
        className={open ? "hidden" : "flex flex-col items-end gap-1"}
      >
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={isPending}
        >
          {isPending
            ? conversationCopy.thread.ending
            : conversationCopy.thread.endConversation}
        </Button>
        {error ? (
          <FieldError className="text-xs">{error}</FieldError>
        ) : null}
      </div>
      <Dialog
        open={open}
        title={conversationCopy.thread.endConversation}
        description={conversationCopy.thread.confirmEnd}
        cancelLabel={conversationCopy.thread.cancelEnd}
        confirmLabel={conversationCopy.thread.endConversation}
        confirmVariant="destructive"
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
