"use server";

import { respondCopy } from "@/lib/copy/respond";
import { claimThreadSchema } from "@/lib/validations/respond";
import { createClient } from "@/lib/supabase/server";

export type ClaimThreadResult =
  | { ok: true; threadId: string }
  | { ok: false; error: string };

const CLAIM_ERROR_CODES = [
  "thread_not_available",
  "self_match_forbidden",
  "opt_in_required",
  "already_claimed",
  "active_responder_thread_exists",
] as const;

function mapClaimRpcError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("not_authenticated")) {
    return respondCopy.errors.unauthenticated;
  }

  if (lower.includes("active_responder_thread_exists")) {
    return respondCopy.errors.activeEngagement;
  }

  if (CLAIM_ERROR_CODES.some((code) => lower.includes(code))) {
    return respondCopy.errors.threadUnavailable;
  }

  return respondCopy.errors.generic;
}

export async function claimThread(
  _prevState: ClaimThreadResult | Record<string, never>,
  formData: FormData,
): Promise<ClaimThreadResult> {
  const parsed = claimThreadSchema.safeParse({
    threadId: formData.get("threadId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? respondCopy.errors.generic,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: respondCopy.errors.unauthenticated };
  }

  const { data: threadId, error } = await supabase.rpc(
    "claim_thread_for_responder",
    { p_thread_id: parsed.data.threadId },
  );

  if (error) {
    return { ok: false, error: mapClaimRpcError(error.message) };
  }

  if (!threadId || typeof threadId !== "string") {
    return { ok: false, error: respondCopy.errors.generic };
  }

  return { ok: true, threadId };
}
