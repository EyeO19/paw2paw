import { FooterHomeLink } from "@/app/components/footer-home-link";
import { LogoutButton } from "@/app/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export async function PageFooter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <footer className="mt-auto flex w-full items-center justify-between border-t border-border-subtle px-4 py-4 md:px-6">
      <FooterHomeLink />
      {user ? <LogoutButton /> : <span aria-hidden="true" />}
    </footer>
  );
}
