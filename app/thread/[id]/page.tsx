import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { formatTopicTagLabel } from "@/lib/constants/format-topic-tag";
import { respondCopy } from "@/lib/copy/respond";
import { createClient } from "@/lib/supabase/server";

type ThreadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ThreadPage({ params }: ThreadPageProps) {
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
    .select("id, status, topic_tags, writer_id, responder_id")
    .eq("id", id)
    .maybeSingle();

  if (!thread) {
    notFound();
  }

  if (thread.status === "pending") {
    if (thread.writer_id === user.id) {
      redirect(`/thread/${id}/pending`);
    }
    redirect("/respond");
  }

  if (thread.status === "closed") {
    redirect("/");
  }

  if (thread.status !== "matched") {
    redirect("/");
  }

  const topicTags: string[] = thread.topic_tags ?? [];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-md flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            {respondCopy.thread.matchedTitle}
          </h1>
          <p className="text-sm text-zinc-600">{respondCopy.thread.matchedBody}</p>
        </div>
        <p className="text-xs text-zinc-500">
          {respondCopy.thread.threadIdLabel}: {thread.id}
        </p>
        {topicTags.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-zinc-900">
              {respondCopy.thread.topicsLabel}
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
        <Link
          href="/"
          className="text-sm font-medium text-zinc-900 underline"
        >
          {respondCopy.thread.homeLink}
        </Link>
      </div>
    </div>
  );
}
