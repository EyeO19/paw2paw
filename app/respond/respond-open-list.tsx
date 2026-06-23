"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { claimThread, type ClaimThreadResult } from "@/app/actions/respond";
import { TopicBadge } from "@/app/components/ui/topic-badge";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { FieldError } from "@/app/components/ui/input";
import { respondCopy } from "@/lib/copy/respond";

export type RespondOpenItem = {
  id: string;
  topicTags: string[];
  preview: string;
  createdAgo: string;
};

const initialState: ClaimThreadResult | Record<string, never> = {};

type RespondClaimCardProps = {
  item: RespondOpenItem;
};

function RespondClaimCard({ item }: RespondClaimCardProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(claimThread, initialState);

  useEffect(() => {
    if ("ok" in state && state.ok === true) {
      router.push(`/thread/${state.threadId}`);
    }
  }, [state, router]);

  const error =
    "ok" in state && state.ok === false ? state.error : undefined;

  return (
    <Card className="flex flex-col gap-3 p-4">
      {error ? <FieldError>{error}</FieldError> : null}
      {item.topicTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {item.topicTags.map((tag) => (
            <TopicBadge key={tag} tag={tag} />
          ))}
        </div>
      ) : null}
      <p className="text-sm text-ink-primary">{item.preview}</p>
      <p className="text-xs text-ink-tertiary">
        {respondCopy.respond.createdLabel} {item.createdAgo}
      </p>
      <form action={formAction}>
        <input type="hidden" name="threadId" value={item.id} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? respondCopy.respond.claiming
            : respondCopy.respond.respondButton}
        </Button>
      </form>
    </Card>
  );
}

type RespondOpenListProps = {
  items: RespondOpenItem[];
};

export function RespondOpenList({ items }: RespondOpenListProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-center text-sm text-ink-secondary">
        {respondCopy.respond.listIntro}
      </p>
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.id}>
            <RespondClaimCard item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
