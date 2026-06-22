"use client";

import { useActionState } from "react";

import { updateProfile, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/app/components/ui/button";
import {
  Checkbox,
  FieldError,
  FieldHint,
} from "@/app/components/ui/input";
import type { TopicTag } from "@/lib/constants/topic-tags";
import { TOPIC_TAGS } from "@/lib/constants/topic-tags";
import { settingsCopy } from "@/lib/copy/settings";

const initialState: AuthActionState = {};

type SettingsFormProps = {
  selectedTags: TopicTag[];
  returnTo: string;
};

export function SettingsForm({ selectedTags, returnTo }: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );
  const selectedSet = new Set(selectedTags);

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      <input type="hidden" name="from" value={returnTo} />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-ink-primary">
          {settingsCopy.topicsLabel}
        </legend>
        <FieldHint>{settingsCopy.topicsHint}</FieldHint>
        <div className="flex flex-col gap-2">
          {TOPIC_TAGS.map((tag) => (
            <label
              key={tag}
              className="flex min-h-11 items-center gap-3 text-sm text-ink-secondary"
            >
              <Checkbox
                type="checkbox"
                name="topicTags"
                value={tag}
                defaultChecked={selectedSet.has(tag)}
              />
              <span className="capitalize">{tag.replace(/-/g, " ")}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error ? <FieldError>{state.error}</FieldError> : null}
      <Button type="submit" disabled={pending}>
        {pending ? settingsCopy.submitting : settingsCopy.submit}
      </Button>
    </form>
  );
}
