import { notFound, redirect } from "next/navigation";

import { ReciprocityGate } from "@/app/components/reciprocity-gate";
import { TopicBadge } from "@/app/components/ui/topic-badge";
import {
  PageDescription,
  PageShell,
  PageTitle,
  TextLink,
} from "@/app/components/ui/page-shell";
import { getReciprocityStatus } from "@/lib/auth/reciprocity";
import { composeCopy } from "@/lib/copy/compose";
import { createClient } from "@/lib/supabase/server";

type PendingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ThreadPendingPage({ params }: PendingPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: thread } = await supabase
    .from("threads")
    .select("id, status, topic_tags, writer_id")
    .eq("id", id)
    .maybeSingle();

  if (!thread) {
    notFound();
  }

  if (thread.writer_id !== user.id) {
    notFound();
  }

  if (thread.status === "matched") {
    redirect(`/thread/${id}`);
  }

  if (thread.status !== "pending") {
    redirect("/");
  }

  const topicTags: string[] = thread.topic_tags ?? [];
  const reciprocity = await getReciprocityStatus(supabase, user.id);

  return (
    <PageShell>
      <div className="flex flex-col gap-2 text-center">
        <PageTitle>{composeCopy.pending.title}</PageTitle>
        <PageDescription>{composeCopy.pending.body}</PageDescription>
      </div>
      {topicTags.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-sm font-medium text-ink-primary">
            {composeCopy.pending.topicsLabel}
          </h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {topicTags.map((tag) => (
              <li key={tag}>
                <TopicBadge tag={tag} className="px-3 py-1 text-sm" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {reciprocity.requiresReciprocity ? <ReciprocityGate /> : null}
      <div className="flex flex-col items-center gap-2 text-sm">
        <TextLink href="/inbox">{composeCopy.pending.inboxLink}</TextLink>
      </div>
    </PageShell>
  );
}
