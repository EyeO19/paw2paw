import { redirect } from "next/navigation";

import {
  RespondAssignment,
  type RespondAssignmentItem,
} from "@/app/respond/respond-assignment";
import { PageShell, PageTitle } from "@/app/components/ui/page-shell";
import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { getActiveResponderThreadId } from "@/lib/inbox/get-active-responder-thread";
import {
  loadRespondThreads,
  respondPreview,
} from "@/lib/inbox/load-respond-threads";
import { pickRandomRespondThread } from "@/lib/inbox/pick-random-respond-thread";
import { respondCopy } from "@/lib/copy/respond";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { createClient } from "@/lib/supabase/server";

export default async function RespondPage() {
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

  const activeThreadId = await getActiveResponderThreadId(supabase, user.id);
  if (activeThreadId) {
    redirect(`/thread/${activeThreadId}`);
  }

  const userTopicTags = profile?.topic_tags ?? [];

  const { threads: rows, error } = await loadRespondThreads(
    supabase,
    userTopicTags,
    user.id,
    50,
  );

  if (error) {
    throw new Error("Failed to load open conversations");
  }

  const assignmentRow = pickRandomRespondThread(rows);

  if (!assignmentRow) {
    return (
      <PageShell width="lg">
        <PageTitle>{respondCopy.respond.title}</PageTitle>
        <p className="text-center text-sm text-ink-secondary">
          {respondCopy.respond.empty}
        </p>
      </PageShell>
    );
  }

  const assignment: RespondAssignmentItem = {
    id: assignmentRow.id,
    topicTags: assignmentRow.topic_tags ?? [],
    preview: respondPreview(assignmentRow.messages),
    createdAgo: formatRelativeTime(assignmentRow.created_at),
  };

  return (
    <PageShell width="lg">
      <PageTitle>{respondCopy.respond.title}</PageTitle>
      <RespondAssignment assignment={assignment} />
    </PageShell>
  );
}
