"use client";

import { useActionState } from "react";

import { updateProfile, type AuthActionState } from "@/app/actions/auth";
import type { TopicTag } from "@/lib/constants/topic-tags";
import { TOPIC_TAGS } from "@/lib/constants/topic-tags";
import { settingsCopy } from "@/lib/copy/settings";

const initialState: AuthActionState = {};

type SettingsFormProps = {
  selectedTags: TopicTag[];
  optInResponder: boolean;
  returnTo: string;
};

export function SettingsForm({
  selectedTags,
  optInResponder,
  returnTo,
}: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );
  const selectedSet = new Set(selectedTags);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-6">
      <input type="hidden" name="from" value={returnTo} />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-zinc-900">
          {settingsCopy.topicsLabel}
        </legend>
        <p className="text-sm text-zinc-600">{settingsCopy.topicsHint}</p>
        <div className="flex flex-col gap-2">
          {TOPIC_TAGS.map((tag) => (
            <label
              key={tag}
              className="flex items-center gap-2 text-sm text-zinc-800"
            >
              <input
                type="checkbox"
                name="topicTags"
                value={tag}
                defaultChecked={selectedSet.has(tag)}
                className="size-4 rounded border-zinc-300"
              />
              <span className="capitalize">{tag.replace(/-/g, " ")}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <input
            type="checkbox"
            name="optInResponder"
            defaultChecked={optInResponder}
            className="size-4 rounded border-zinc-300"
          />
          {settingsCopy.optInLabel}
        </span>
        <span className="text-sm text-zinc-600">{settingsCopy.optInHint}</span>
      </label>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? settingsCopy.submitting : settingsCopy.submit}
      </button>
    </form>
  );
}
