import { HomeGuest, HomeMindMap } from "@/app/components/home-mind-map";
import { GlassPage } from "@/app/components/glass/glass-page";
import { needsOnboarding } from "@/lib/auth/onboarding";
import {
  canCompose,
  canStartWriterConversation,
  getReciprocityStatus,
} from "@/lib/auth/reciprocity";
import { getActiveResponderThreadId } from "@/lib/inbox/get-active-responder-thread";
import { getWriterOpenThreadCount } from "@/lib/inbox/get-writer-open-thread-count";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showRespond = false;
  let canComposeNow = false;
  let canStartNewConversation = false;
  let writerOpenCount = 0;
  let activeResponderThreadId: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("topic_tags")
      .eq("id", user.id)
      .maybeSingle();

    const onboarded = !needsOnboarding(profile);
    if (onboarded) {
      const [reciprocity, responderThreadId, openCount] = await Promise.all([
        getReciprocityStatus(supabase, user.id),
        getActiveResponderThreadId(supabase, user.id),
        getWriterOpenThreadCount(supabase, user.id),
      ]);

      showRespond = true;
      canComposeNow = canCompose(reciprocity);
      canStartNewConversation = canStartWriterConversation(
        reciprocity,
        openCount,
      );
      writerOpenCount = openCount;
      activeResponderThreadId = responderThreadId;
    }
  }

  return (
    <GlassPage width="xl" shellClassName="py-6 md:py-10">
      {user ? (
        <HomeMindMap
          showRespond={showRespond}
          canCompose={canComposeNow}
          canStartNewConversation={canStartNewConversation}
          writerOpenCount={writerOpenCount}
          activeResponderThreadId={activeResponderThreadId}
        />
      ) : (
        <HomeGuest />
      )}
    </GlassPage>
  );
}
