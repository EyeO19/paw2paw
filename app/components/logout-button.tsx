import { signOut } from "@/app/actions/auth";
import { authCopy } from "@/lib/copy/auth";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="min-h-11 text-sm font-medium text-ink-tertiary underline decoration-border-default underline-offset-2 transition-colors duration-200 hover:text-ink-secondary"
      >
        {authCopy.logout.label}
      </button>
    </form>
  );
}
