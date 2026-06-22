import { Badge } from "@/app/components/ui/badge";
import { TopicBadge } from "@/app/components/ui/topic-badge";
import { CardLink } from "@/app/components/ui/card";
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
  started: InboxThreadItem[];
  supporting: InboxThreadItem[];
};

function statusVariant(
  status: InboxThreadItem["status"],
): "status-pending" | "status-matched" | "status-closed" {
  switch (status) {
    case "pending":
      return "status-pending";
    case "matched":
      return "status-matched";
    case "closed":
      return "status-closed";
  }
}

function statusLabel(thread: InboxThreadItem): string {
  if (thread.status === "pending" && thread.role === "writer") {
    return inboxCopy.inbox.statusPendingWriter;
  }

  switch (thread.status) {
    case "pending":
      return inboxCopy.inbox.statusPendingWriter;
    case "matched":
      return inboxCopy.inbox.statusMatched;
    case "closed":
      return inboxCopy.inbox.statusClosed;
  }
}

function roleLabel(thread: InboxThreadItem): string | null {
  if (thread.role === "writer" && thread.status === "pending") {
    return null;
  }

  if (thread.role === "writer") {
    return inboxCopy.inbox.roleWriter;
  }

  if (thread.status === "closed") {
    return inboxCopy.inbox.roleResponderClosed;
  }

  return inboxCopy.inbox.roleResponder;
}

function ThreadCards({ threads }: { threads: InboxThreadItem[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {threads.map((thread) => {
        const subtitle = roleLabel(thread);

        return (
        <li key={thread.id}>
          <CardLink href={thread.href}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(thread.status)}>
                {statusLabel(thread)}
              </Badge>
              {subtitle ? (
                <span className="text-xs text-ink-tertiary">{subtitle}</span>
              ) : null}
            </div>
            {thread.topicTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {thread.topicTags.map((tag) => (
                  <TopicBadge key={tag} tag={tag} />
                ))}
              </div>
            ) : null}
            {thread.preview ? (
              <p className="line-clamp-2 text-sm text-ink-primary">{thread.preview}</p>
            ) : null}
            <p className="text-xs text-ink-tertiary">
              {inboxCopy.inbox.updatedLabel} {thread.updatedAgo}
            </p>
          </CardLink>
        </li>
        );
      })}
    </ul>
  );
}

export function InboxList({ started, supporting }: InboxListProps) {
  if (started.length === 0 && supporting.length === 0) {
    return (
      <p className="text-center text-sm text-ink-secondary">{inboxCopy.inbox.empty}</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {started.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink-primary">
            {inboxCopy.inbox.sectionStarted}
          </h2>
          <ThreadCards threads={started} />
        </section>
      ) : null}
      {supporting.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-semibold text-ink-primary">
            {inboxCopy.inbox.sectionSupporting}
          </h2>
          <ThreadCards threads={supporting} />
        </section>
      ) : null}
    </div>
  );
}
