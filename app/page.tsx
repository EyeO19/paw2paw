import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";
import { needsOnboarding } from "@/lib/auth/onboarding";
import { authCopy } from "@/lib/copy/auth";
import { composeCopy } from "@/lib/copy/compose";
import { inboxCopy } from "@/lib/copy/inbox";
import { respondCopy } from "@/lib/copy/respond";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showNewConversation = false;
  let showRespond = false;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("topic_tags, opt_in_responder")
      .eq("id", user.id)
      .maybeSingle();

    const onboarded = !needsOnboarding(profile);
    showNewConversation = onboarded;
    showRespond = onboarded && Boolean(profile?.opt_in_responder);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <h1 className="text-3xl font-semibold text-zinc-900">Paw2Paw</h1>
      {user ? (
        <div className="flex flex-col items-center gap-4">
          {showNewConversation ? (
            <>
              <Link
                href="/compose"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                {composeCopy.home.newConversation}
              </Link>
              <Link
                href="/inbox"
                className="text-sm font-medium text-zinc-900 underline"
              >
                {inboxCopy.home.myConversations}
              </Link>
            </>
          ) : null}
          {showRespond ? (
            <Link
              href="/respond"
              className="text-sm font-medium text-zinc-900 underline"
            >
              {respondCopy.home.respondToSomeone}
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      ) : (
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/login" className="text-zinc-900 underline">
            {authCopy.login.submit}
          </Link>
          <Link href="/signup" className="text-zinc-900 underline">
            {authCopy.signup.submit}
          </Link>
        </nav>
      )}
    </div>
  );
}
