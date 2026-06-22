"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, startTransition } from "react";

import { CrisisInterstitial } from "@/app/components/crisis-interstitial";
import { Button } from "@/app/components/ui/button";
import { TopicBadge } from "@/app/components/ui/topic-badge";
import {
  Checkbox,
  FieldError,
  FieldHint,
  Textarea,
} from "@/app/components/ui/input";
import { createThread, type CreateThreadResult } from "@/app/actions/thread";
import { ResourceBridge } from "@/app/thread/[id]/resource-bridge";
import { TOPIC_TAGS, type TopicTag } from "@/lib/constants/topic-tags";
import { useCrisisSendGate } from "@/lib/crisis/use-crisis-send-gate";
import { composeCopy } from "@/lib/copy/compose";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";

const initialState: CreateThreadResult | Record<string, never> = {};
const COMPOSE_SURFACE_ID = "compose";

function orderTopicTags(suggestedTags: string[]): TopicTag[] {
  const suggestedSet = new Set(suggestedTags);
  const fromProfile = TOPIC_TAGS.filter((tag) => suggestedSet.has(tag));
  const other = TOPIC_TAGS.filter((tag) => !suggestedSet.has(tag));
  return [...fromProfile, ...other];
}

type ComposeFormProps = {
  suggestedTags: string[];
};

export function ComposeForm({ suggestedTags }: ComposeFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const submitInFlightRef = useRef(false);
  const [state, formAction, pending] = useActionState(createThread, initialState);
  const [content, setContent] = useState("");
  const orderedTags = orderTopicTags(suggestedTags);
  const suggestedSet = new Set(suggestedTags);
  const hasSuggestions = suggestedTags.length > 0;

  const submitContent = (trimmed: string) => {
    if (!formRef.current || pending || submitInFlightRef.current) {
      return;
    }
    submitInFlightRef.current = true;
    const formData = new FormData(formRef.current);
    formData.set("content", trimmed);
    startTransition(() => {
      formAction(formData);
    });
  };

  const {
    requestSend,
    interstitialOpen,
    handleContinue,
    handleExit,
  } = useCrisisSendGate({
    surfaceId: COMPOSE_SURFACE_ID,
    surface: "compose",
    onProceed: submitContent,
    onClearComposer: () => setContent(""),
  });

  useEffect(() => {
    if ("ok" in state && state.ok === false) {
      submitInFlightRef.current = false;
    }
  }, [state]);

  useEffect(() => {
    if ("ok" in state && state.ok === true) {
      trackEvent(ANALYTICS_EVENTS.messageSent, {
        source: "compose",
        thread_id: state.threadId,
      });
      router.push(`/thread/${state.threadId}/pending`);
    }
  }, [state, router]);

  const error =
    "ok" in state && state.ok === false ? state.error : undefined;

  return (
    <>
      <CrisisInterstitial
        open={interstitialOpen}
        onContinue={handleContinue}
        onExit={handleExit}
      />
      <form
        ref={formRef}
        className="flex w-full flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          requestSend(content);
        }}
      >
        <ResourceBridge />
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-ink-primary">
            {composeCopy.compose.topicsLabel}
          </legend>
          <FieldHint>{composeCopy.compose.topicsHint}</FieldHint>
          <div className="flex flex-col gap-2">
            {orderedTags.map((tag, index) => {
              const isSuggested = suggestedSet.has(tag);
              const showSuggestedHint =
                hasSuggestions && isSuggested && index === 0;

              return (
                <div key={tag} className="flex flex-col gap-1">
                  {showSuggestedHint ? (
                    <span className="text-xs font-medium text-ink-tertiary">
                      {composeCopy.compose.suggestedHint}
                    </span>
                  ) : null}
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <Checkbox type="checkbox" name="topicTags" value={tag} />
                    <TopicBadge tag={tag} className="text-sm" />
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>
        <label className="flex flex-col">
          <span className="mb-2 text-sm font-medium text-ink-primary">
            {composeCopy.compose.contentLabel}
          </span>
          <Textarea
            name="content"
            rows={8}
            required
            maxLength={10_000}
            value={content}
            placeholder={composeCopy.compose.contentPlaceholder}
            aria-invalid={Boolean(error)}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" disabled={pending || content.trim().length === 0}>
          {pending ? composeCopy.compose.submitting : composeCopy.compose.submit}
        </Button>
      </form>
    </>
  );
}
