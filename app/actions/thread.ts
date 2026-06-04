"use server";

import { composeCopy } from "@/lib/copy/compose";
import { createThreadSchema } from "@/lib/validations/compose";
import { createClient } from "@/lib/supabase/server";

export type CreateThreadResult =
  | { ok: true; threadId: string }
  | { ok: false; error: string };

const RPC_VALIDATION_CODES = [
  "empty_topic_tags",
  "empty_content",
  "content_too_long",
] as const;

function mapRpcError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("not_authenticated")) {
    return composeCopy.errors.unauthenticated;
  }

  if (RPC_VALIDATION_CODES.some((code) => lower.includes(code))) {
    return composeCopy.errors.generic;
  }

  return composeCopy.errors.generic;
}

export async function createThread(
  _prevState: CreateThreadResult | Record<string, never>,
  formData: FormData,
): Promise<CreateThreadResult> {
  const parsed = createThreadSchema.safeParse({
    topicTags: formData.getAll("topicTags").map(String),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? composeCopy.errors.generic,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: composeCopy.errors.unauthenticated };
  }

  const { data: threadId, error } = await supabase.rpc(
    "create_thread_with_message",
    {
      p_topic_tags: parsed.data.topicTags,
      p_content: parsed.data.content,
    },
  );

  if (error) {
    return { ok: false, error: mapRpcError(error.message) };
  }

  if (!threadId || typeof threadId !== "string") {
    return { ok: false, error: composeCopy.errors.generic };
  }

  return { ok: true, threadId };
}
