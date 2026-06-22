import type { SupabaseClient } from "@supabase/supabase-js";

export async function getActiveResponderThreadId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("threads")
    .select("id")
    .eq("responder_id", userId)
    .eq("status", "matched")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
