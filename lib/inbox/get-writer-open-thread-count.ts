import type { SupabaseClient } from "@supabase/supabase-js";

export async function getWriterOpenThreadCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("writer_id", userId)
    .in("status", ["pending", "matched"]);

  return count ?? 0;
}
