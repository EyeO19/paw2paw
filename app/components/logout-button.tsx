import { signOut } from "@/app/actions/auth";
import { authCopy } from "@/lib/copy/auth";

export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900"
      >
        {authCopy.logout.label}
      </button>
    </form>
  );
}
