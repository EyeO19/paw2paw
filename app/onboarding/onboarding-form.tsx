"use client";

import { useActionState } from "react";

import { completeOnboarding, type AuthActionState } from "@/app/actions/auth";
import { TOPIC_TAGS } from "@/lib/constants/topic-tags";
import { authCopy } from "@/lib/copy/auth";

const initialState: AuthActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-zinc-900">
          {authCopy.onboarding.topicsLabel}
        </legend>
        <p className="text-sm text-zinc-600">{authCopy.onboarding.topicsHint}</p>
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
            className="size-4 rounded border-zinc-300"
          />
          {authCopy.onboarding.optInLabel}
        </span>
        <span className="text-sm text-zinc-600">{authCopy.onboarding.optInHint}</span>
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
        {pending ? authCopy.onboarding.submitting : authCopy.onboarding.submit}
      </button>
    </form>
  );
}
