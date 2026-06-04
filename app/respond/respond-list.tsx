"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { claimThread, type ClaimThreadResult } from "@/app/actions/respond";
import { formatTopicTagLabel } from "@/lib/constants/format-topic-tag";
import { respondCopy } from "@/lib/copy/respond";

export type RespondThreadItem = {
  id: string;
  topicTags: string[];
  preview: string;
  createdAgo: string;
};

const initialState: ClaimThreadResult | Record<string, never> = {};

type RespondListProps = {
  threads: RespondThreadItem[];
};

export function RespondList({ threads }: RespondListProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(claimThread, initialState);

  useEffect(() => {
    if ("ok" in state && state.ok === true) {
      router.push(`/thread/${state.threadId}`);
    }
  }, [state, router]);

  const error =
    "ok" in state && state.ok === false ? state.error : undefined;

  if (threads.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-600">{respondCopy.respond.empty}</p>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {threads.map((thread) => (
          <li
            key={thread.id}
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4"
          >
            <div className="flex flex-wrap gap-2">
              {thread.topicTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs capitalize text-zinc-700"
                >
                  {formatTopicTagLabel(tag)}
                </span>
              ))}
            </div>
            <p className="text-sm text-zinc-800">{thread.preview}</p>
            <p className="text-xs text-zinc-500">
              {respondCopy.respond.createdLabel} {thread.createdAgo}
            </p>
            <form action={formAction}>
              <input type="hidden" name="threadId" value={thread.id} />
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {pending
                  ? respondCopy.respond.claiming
                  : respondCopy.respond.respondButton}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
