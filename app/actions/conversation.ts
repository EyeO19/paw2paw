"use server";

import { conversationCopy } from "@/lib/copy/conversation";
import {
  endConversationSchema,
  flagMessageSchema,
  sendMessageSchema,
} from "@/lib/validations/conversation";
import { createClient } from "@/lib/supabase/server";

export type SendMessageResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export type EndConversationResult =
  | { ok: true }
  | { ok: false; error: string };

export type FlagMessageResult = { ok: true } | { ok: false; error: string };

const SEND_ERROR_CODES = [
  "not_authenticated",
  "not_participant",
  "thread_not_matched",
  "empty_content",
  "content_too_long",
] as const;

const END_ERROR_CODES = [
  "not_authenticated",
  "not_participant",
  "thread_not_matched",
  "already_closed",
] as const;

function mapSendRpcError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("not_authenticated")) {
    return conversationCopy.errors.unauthenticated;
  }

  if (SEND_ERROR_CODES.some((code) => lower.includes(code))) {
    return conversationCopy.errors.sendFailed;
  }

  return conversationCopy.errors.generic;
}

function mapEndRpcError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("not_authenticated")) {
    return conversationCopy.errors.unauthenticated;
  }

  if (END_ERROR_CODES.some((code) => lower.includes(code))) {
    return conversationCopy.errors.endFailed;
  }

  return conversationCopy.errors.generic;
}

export async function sendMessage(input: {
  threadId: string;
  content: string;
}): Promise<SendMessageResult> {
  const parsed = sendMessageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? conversationCopy.errors.generic,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: conversationCopy.errors.unauthenticated };
  }

  const { data: messageId, error } = await supabase.rpc("send_message", {
    p_thread_id: parsed.data.threadId,
    p_content: parsed.data.content,
  });

  if (error) {
    return { ok: false, error: mapSendRpcError(error.message) };
  }

  if (!messageId || typeof messageId !== "string") {
    return { ok: false, error: conversationCopy.errors.sendFailed };
  }

  return { ok: true, messageId };
}

export async function endConversation(input: {
  threadId: string;
}): Promise<EndConversationResult> {
  const parsed = endConversationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? conversationCopy.errors.generic,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: conversationCopy.errors.unauthenticated };
  }

  const { error } = await supabase.rpc("close_thread", {
    p_thread_id: parsed.data.threadId,
  });

  if (error) {
    return { ok: false, error: mapEndRpcError(error.message) };
  }

  return { ok: true };
}

export async function flagMessage(input: {
  messageId: string;
  threadId: string;
}): Promise<FlagMessageResult> {
  const parsed = flagMessageSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? conversationCopy.errors.generic,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: conversationCopy.errors.unauthenticated };
  }

  const { data: updated, error } = await supabase
    .from("messages")
    .update({ flagged: true })
    .eq("id", parsed.data.messageId)
    .eq("thread_id", parsed.data.threadId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: conversationCopy.report.toastError };
  }

  if (!updated) {
    return { ok: false, error: conversationCopy.report.toastError };
  }

  return { ok: true };
}
