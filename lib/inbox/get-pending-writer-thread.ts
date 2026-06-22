import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPendingWriterThreadId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("threads")
    .select("id")
    .eq("writer_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
