import { SignupForm } from "@/app/signup/signup-form";
import { PageShell, PageTitle } from "@/app/components/ui/page-shell";
import { authCopy } from "@/lib/copy/auth";

export default function SignupPage() {
  return (
    <PageShell width="sm">
      <div className="flex flex-col items-center gap-6">
        <PageTitle className="text-center">{authCopy.signup.title}</PageTitle>
        <SignupForm />
      </div>
    </PageShell>
  );
}
