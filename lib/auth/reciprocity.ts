import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_WRITER_OPEN_THREADS } from "@/lib/constants/conversation-limits";

export type ReciprocityStatus = {
  hasStartedThread: boolean;
  hasRespondedToOther: boolean;
  requiresReciprocity: boolean;
};

export function canCompose(status: ReciprocityStatus): boolean {
  return !status.hasStartedThread || status.hasRespondedToOther;
}

export function canStartWriterConversation(
  status: ReciprocityStatus,
  openWriterCount: number,
  maxOpen = MAX_WRITER_OPEN_THREADS,
): boolean {
  return canCompose(status) && openWriterCount < maxOpen;
}

export async function getReciprocityStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReciprocityStatus> {
  const [{ count: writerCount }, { count: responderCount }] = await Promise.all([
    supabase
      .from("threads")
      .select("id", { count: "exact", head: true })
      .eq("writer_id", userId),
    supabase
      .from("threads")
      .select("id", { count: "exact", head: true })
      .eq("responder_id", userId),
  ]);

  const hasStartedThread = (writerCount ?? 0) > 0;
  const hasRespondedToOther = (responderCount ?? 0) > 0;

  return {
    hasStartedThread,
    hasRespondedToOther,
    requiresReciprocity: hasStartedThread && !hasRespondedToOther,
  };
}
