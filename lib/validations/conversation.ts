import { z } from "zod";

export const sendMessageSchema = z.object({
  threadId: z.uuid("Invalid thread"),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(10_000, "Message is too long (10,000 character limit)"),
});

export const endConversationSchema = z.object({
  threadId: z.uuid("Invalid thread"),
});

export const flagMessageSchema = z.object({
  messageId: z.uuid("Invalid message"),
  threadId: z.uuid("Invalid thread"),
});

export const wellbeingThreadSchema = z.object({
  threadId: z.uuid("Invalid thread"),
});

export const wellbeingResponseSchema = z.object({
  threadId: z.uuid("Invalid thread"),
  response: z.enum(["up", "down", "neutral"]),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EndConversationInput = z.infer<typeof endConversationSchema>;
export type FlagMessageInput = z.infer<typeof flagMessageSchema>;
export type WellbeingThreadInput = z.infer<typeof wellbeingThreadSchema>;
export type WellbeingResponseInput = z.infer<typeof wellbeingResponseSchema>;
