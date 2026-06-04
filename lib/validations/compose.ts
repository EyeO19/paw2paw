import { z } from "zod";

import { topicTagsSchema } from "@/lib/constants/topic-tags";

export const createThreadSchema = z.object({
  topicTags: topicTagsSchema,
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(10_000, "Message is too long (10,000 character limit)"),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
