import type { TopicTag } from "@/lib/constants/topic-tags";
import { TOPIC_TAGS } from "@/lib/constants/topic-tags";

const topicTagClassNames: Record<TopicTag, string> = {
  "mental-health": "bg-tag-mental-health-surface text-tag-mental-health",
  identity: "bg-tag-identity-surface text-tag-identity",
  academics: "bg-tag-academics-surface text-tag-academics",
  athletics: "bg-tag-athletics-surface text-tag-athletics",
  relationships: "bg-tag-relationships-surface text-tag-relationships",
  "campus-life": "bg-tag-campus-life-surface text-tag-campus-life",
  family: "bg-tag-family-surface text-tag-family",
  other: "bg-tag-other-surface text-tag-other",
};

export function topicTagClassName(tag: string): string {
  if (TOPIC_TAGS.includes(tag as TopicTag)) {
    return topicTagClassNames[tag as TopicTag];
  }

  return topicTagClassNames.other;
}
