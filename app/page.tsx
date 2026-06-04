import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";
import { authCopy } from "@/lib/copy/auth";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <h1 className="text-3xl font-semibold text-zinc-900">Paw2Paw</h1>
      {user ? (
        <LogoutButton />
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
