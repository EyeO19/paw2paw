import { redirect } from "next/navigation";

import { ComposeForm } from "@/app/compose/compose-form";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { composeCopy } from "@/lib/copy/compose";
import { createClient } from "@/lib/supabase/server";

export default async function ComposePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profileResult = await ensureUserProfile(supabase, user.id);
  if (!profileResult.ok) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("topic_tags")
    .eq("id", user.id)
    .single();

  const suggestedTags = profile?.topic_tags ?? [];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {composeCopy.compose.title}
        </h1>
        <ComposeForm suggestedTags={suggestedTags} />
      </div>
    </div>
  );
}
