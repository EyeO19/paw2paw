import type { HTMLAttributes } from "react";

import { formatTopicTagLabel } from "@/lib/constants/format-topic-tag";
import { cn } from "@/lib/design/cn";
import { topicTagClassName } from "@/lib/design/topic-tag-style";

type TopicBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tag: string;
};

export function TopicBadge({ tag, className, children, ...props }: TopicBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-3 py-1 text-xs font-semibold capitalize",
        topicTagClassName(tag),
        className,
      )}
      {...props}
    >
      {children ?? formatTopicTagLabel(tag)}
    </span>
  );
}
