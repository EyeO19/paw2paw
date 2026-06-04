import Link from "next/link";

import { formatTopicTagLabel } from "@/lib/constants/format-topic-tag";
import { inboxCopy } from "@/lib/copy/inbox";

export type InboxThreadItem = {
  id: string;
  status: "pending" | "matched" | "closed";
  role: "writer" | "responder";
  topicTags: string[];
  preview: string;
  updatedAgo: string;
  href: string;
};

type InboxListProps = {
  threads: InboxThreadItem[];
};

function statusLabel(status: InboxThreadItem["status"]): string {
  switch (status) {
    case "pending":
      return inboxCopy.inbox.statusPending;
    case "matched":
      return inboxCopy.inbox.statusMatched;
    case "closed":
      return inboxCopy.inbox.statusClosed;
  }
}

function roleLabel(role: InboxThreadItem["role"]): string {
  return role === "writer"
    ? inboxCopy.inbox.roleWriter
    : inboxCopy.inbox.roleResponder;
}

export function InboxList({ threads }: InboxListProps) {
  if (threads.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-600">{inboxCopy.inbox.empty}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {threads.map((thread) => (
        <li key={thread.id}>
          <Link
            href={thread.href}
            className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                {statusLabel(thread.status)}
              </span>
              <span className="text-xs text-zinc-500">{roleLabel(thread.role)}</span>
            </div>
            {thread.topicTags.length > 0 ? (
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
            ) : null}
            {thread.preview ? (
              <p className="line-clamp-2 text-sm text-zinc-800">{thread.preview}</p>
            ) : null}
            <p className="text-xs text-zinc-500">
              {inboxCopy.inbox.updatedLabel} {thread.updatedAgo}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
