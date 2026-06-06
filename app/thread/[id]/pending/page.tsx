import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatTopicTagLabel } from "@/lib/constants/format-topic-tag";
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-md flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            {composeCopy.pending.title}
          </h1>
          <p className="text-sm text-zinc-600">{composeCopy.pending.body}</p>
        </div>
        {topicTags.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-900">
              {composeCopy.pending.topicsLabel}
            </h2>
            <ul className="flex flex-wrap justify-center gap-2">
              {topicTags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-sm capitalize text-zinc-800"
                >
                  {formatTopicTagLabel(tag)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-col items-center gap-2 text-sm">
          <Link
            href="/inbox"
            className="font-medium text-zinc-900 underline"
          >
            {composeCopy.pending.inboxLink}
          </Link>
          <Link href="/" className="text-zinc-600 underline">
            {composeCopy.pending.homeLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
