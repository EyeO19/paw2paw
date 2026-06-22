import { redirect } from "next/navigation";

import { ComposeForm } from "@/app/compose/compose-form";
import { GlassPage } from "@/app/components/glass/glass-page";
import { GlassPanel } from "@/app/components/glass/glass-panel";
import { ReciprocityGate } from "@/app/components/reciprocity-gate";
import { PageDescription, PageTitle, TextLink } from "@/app/components/ui/page-shell";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { needsOnboarding } from "@/lib/auth/onboarding";
import {
  canCompose,
  canStartWriterConversation,
  getReciprocityStatus,
} from "@/lib/auth/reciprocity";
import { getWriterOpenThreadCount } from "@/lib/inbox/get-writer-open-thread-count";
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

  if (needsOnboarding(profile)) {
    redirect("/onboarding");
  }

  const [reciprocity, writerOpenCount] = await Promise.all([
    getReciprocityStatus(supabase, user.id),
    getWriterOpenThreadCount(supabase, user.id),
  ]);
  const suggestedTags = profile?.topic_tags ?? [];
  const canStartNew = canStartWriterConversation(reciprocity, writerOpenCount);

  return (
    <GlassPage>
      <PageTitle>{composeCopy.compose.title}</PageTitle>
      <GlassPanel>
        {canCompose(reciprocity) ? (
          canStartNew ? (
            <ComposeForm suggestedTags={suggestedTags} />
          ) : (
            <div className="flex flex-col gap-4">
              <PageDescription>{composeCopy.compose.writerLimit}</PageDescription>
              <TextLink href="/inbox">{composeCopy.pending.inboxLink}</TextLink>
            </div>
          )
        ) : (
          <ReciprocityGate className="border-0 bg-transparent p-0 shadow-none backdrop-blur-none" />
        )}
      </GlassPanel>
    </GlassPage>
  );
}
