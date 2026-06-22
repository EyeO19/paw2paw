"use client";

import { useActionState } from "react";

import { completeOnboarding, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/app/components/ui/button";
import {
  Checkbox,
  FieldError,
  FieldHint,
} from "@/app/components/ui/input";
import { TOPIC_TAGS } from "@/lib/constants/topic-tags";
import { authCopy } from "@/lib/copy/auth";

const initialState: AuthActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-ink-primary">
          {authCopy.onboarding.topicsLabel}
        </legend>
        <FieldHint>{authCopy.onboarding.topicsHint}</FieldHint>
        <div className="flex flex-col gap-2">
          {TOPIC_TAGS.map((tag) => (
            <label
              key={tag}
              className="flex min-h-11 items-center gap-3 text-sm text-ink-secondary"
            >
              <Checkbox type="checkbox" name="topicTags" value={tag} />
              <span className="capitalize">{tag.replace(/-/g, " ")}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error ? <FieldError>{state.error}</FieldError> : null}
      <Button type="submit" disabled={pending}>
        {pending ? authCopy.onboarding.submitting : authCopy.onboarding.submit}
      </Button>
    </form>
  );
}
