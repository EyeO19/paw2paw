import { z } from "zod";

export const TOPIC_TAGS = [
  "identity",
  "mental-health",
  "academics",
  "relationships",
  "campus-life",
  "family",
  "other",
] as const;

export type TopicTag = (typeof TOPIC_TAGS)[number];

export const topicTagSchema = z.enum(TOPIC_TAGS);

export const topicTagsSchema = z
  .array(topicTagSchema)
  .min(1, "Select at least one topic")
  .max(5, "Select at most five topics");
