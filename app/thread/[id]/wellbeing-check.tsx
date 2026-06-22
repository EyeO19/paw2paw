"use client";

import { useState } from "react";

import {
  reopenConversation,
  respondWellbeingCheck,
  sendWellbeingPrompt,
} from "@/app/actions/conversation";
import { Button } from "@/app/components/ui/button";
import type { WellbeingResponse, WellbeingState } from "@/lib/conversation/wellbeing";
import { wellbeingCopy } from "@/lib/copy/wellbeing";

type WellbeingCheckProps = {
  threadId: string;
  currentUserId: string;
  initialState: WellbeingState;
  onReopened: () => void;
};

export function WellbeingCheck({
  threadId,
  currentUserId,
  initialState,
  onReopened,
}: WellbeingCheckProps) {
  const [state, setState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPromptSender = state.promptSenderId === currentUserId;
  const canSendPrompt = !state.promptSentAt;
  const canRespond =
    Boolean(state.promptSentAt) &&
    !state.response &&
    !isPromptSender;
  const canReopen =
    state.response === "down" || state.response === "neutral";

  const handleSendPrompt = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await sendWellbeingPrompt({ threadId });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setState({
      promptSentAt: new Date().toISOString(),
      promptSenderId: currentUserId,
      response: null,
      respondedBy: null,
    });
  };

  const handleRespond = async (response: WellbeingResponse) => {
    setIsSubmitting(true);
    setError(null);

    const result = await respondWellbeingCheck({ threadId, response });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setState((current) => ({
      ...current,
      response,
      respondedBy: currentUserId,
    }));
  };

  const handleReopen = async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await reopenConversation({ threadId });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onReopened();
  };

  return (
    <div className="border-t border-border-subtle/60 bg-surface/55 px-4 py-4 backdrop-blur-md">
      {error ? (
        <p className="mb-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {canSendPrompt ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleSendPrompt()}
            disabled={isSubmitting}
          >
            {isSubmitting ? wellbeingCopy.sendingPrompt : wellbeingCopy.sendPrompt}
          </Button>
        </div>
      ) : null}

      {state.promptSentAt && !state.response ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="rounded-md bg-surface-subtle px-4 py-3 text-sm text-ink-secondary">
            {wellbeingCopy.promptMessage}
          </p>
          {canRespond ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-ink-primary">
                {wellbeingCopy.respondLabel}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleRespond("up")}
                  disabled={isSubmitting}
                  aria-label={wellbeingCopy.thumbsUp}
                >
                  👍 {wellbeingCopy.thumbsUp}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleRespond("neutral")}
                  disabled={isSubmitting}
                  aria-label={wellbeingCopy.thumbsNeutral}
                >
                  😐 {wellbeingCopy.thumbsNeutral}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void handleRespond("down")}
                  disabled={isSubmitting}
                  aria-label={wellbeingCopy.thumbsDown}
                >
                  👎 {wellbeingCopy.thumbsDown}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-secondary">
              {wellbeingCopy.waitingForResponse}
            </p>
          )}
        </div>
      ) : null}

      {state.response ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-ink-secondary">
            {wellbeingCopy.responseRecorded}
          </p>
          {canReopen ? (
            <Button
              type="button"
              onClick={() => void handleReopen()}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? wellbeingCopy.reopening
                : wellbeingCopy.reopenConversation}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
