"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { createThread, type CreateThreadResult } from "@/app/actions/thread";
import { TOPIC_TAGS, type TopicTag } from "@/lib/constants/topic-tags";
import { formatTopicTagLabel } from "@/lib/constants/format-topic-tag";
import { composeCopy } from "@/lib/copy/compose";

const initialState: CreateThreadResult | Record<string, never> = {};

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
  const [state, formAction, pending] = useActionState(createThread, initialState);
  const orderedTags = orderTopicTags(suggestedTags);
  const suggestedSet = new Set(suggestedTags);
  const hasSuggestions = suggestedTags.length > 0;

  useEffect(() => {
    if ("ok" in state && state.ok === true) {
      router.push(`/thread/${state.threadId}/pending`);
    }
  }, [state, router]);

  const error =
    "ok" in state && state.ok === false ? state.error : undefined;

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-zinc-900">
          {composeCopy.compose.topicsLabel}
        </legend>
        <p className="text-sm text-zinc-600">{composeCopy.compose.topicsHint}</p>
        <div className="flex flex-col gap-2">
          {orderedTags.map((tag, index) => {
            const isSuggested = suggestedSet.has(tag);
            const showSuggestedHint =
              hasSuggestions && isSuggested && index === 0;

            return (
              <div key={tag} className="flex flex-col gap-1">
                {showSuggestedHint ? (
                  <span className="text-xs font-medium text-zinc-500">
                    {composeCopy.compose.suggestedHint}
                  </span>
                ) : null}
                <label className="flex items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    name="topicTags"
                    value={tag}
                    className="size-4 rounded border-zinc-300"
                  />
                  <span className="capitalize">{formatTopicTagLabel(tag)}</span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-900">
          {composeCopy.compose.contentLabel}
        </span>
        <textarea
          name="content"
          rows={8}
          required
          placeholder={composeCopy.compose.contentPlaceholder}
          aria-invalid={Boolean(error)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? composeCopy.compose.submitting : composeCopy.compose.submit}
      </button>
    </form>
  );
}
