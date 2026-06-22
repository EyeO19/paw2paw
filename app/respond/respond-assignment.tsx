"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { claimThread, type ClaimThreadResult } from "@/app/actions/respond";
import { TopicBadge } from "@/app/components/ui/topic-badge";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { FieldError } from "@/app/components/ui/input";
import { respondCopy } from "@/lib/copy/respond";

export type RespondAssignmentItem = {
  id: string;
  topicTags: string[];
  preview: string;
  createdAgo: string;
};

const initialState: ClaimThreadResult | Record<string, never> = {};

type RespondAssignmentProps = {
  assignment: RespondAssignmentItem;
};

export function RespondAssignment({ assignment }: RespondAssignmentProps) {
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
    <div className="flex w-full flex-col gap-4">
      <p className="text-center text-sm text-ink-secondary">
        {respondCopy.respond.assignmentIntro}
      </p>
      {error ? <FieldError>{error}</FieldError> : null}
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {assignment.topicTags.map((tag) => (
            <TopicBadge key={tag} tag={tag} />
          ))}
        </div>
        <p className="text-sm text-ink-primary">{assignment.preview}</p>
        <p className="text-xs text-ink-tertiary">
          {respondCopy.respond.createdLabel} {assignment.createdAgo}
        </p>
        <form action={formAction}>
          <input type="hidden" name="threadId" value={assignment.id} />
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? respondCopy.respond.claiming
              : respondCopy.respond.respondButton}
          </Button>
        </form>
      </Card>
    </div>
  );
}
