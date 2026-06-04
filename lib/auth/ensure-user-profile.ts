import type { SupabaseClient } from "@supabase/supabase-js";

import { hashDisplayId } from "@/lib/auth/hash-display-id";

type EnsureUserProfileResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

/**
 * Idempotent profile bootstrap for public.users.
 * Safe to call after signUp (may no-op without session) and after signIn (upsert path).
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<EnsureUserProfileResult> {
  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUserId)
    .maybeSingle();

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  if (existing) {
    return { ok: true, created: false };
  }

  const { error: insertError } = await supabase.from("users").insert({
    id: authUserId,
    hashed_display_id: hashDisplayId(authUserId),
    opt_in_responder: false,
    topic_tags: [],
  });

  if (!insertError) {
    return { ok: true, created: true };
  }

  // Race: another request inserted between select and insert.
  if (insertError.code === "23505") {
    return { ok: true, created: false };
  }

  return { ok: false, error: insertError.message };
}
