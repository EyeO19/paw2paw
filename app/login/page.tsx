import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";
import { PageShell, PageTitle } from "@/app/components/ui/page-shell";
import { authCopy } from "@/lib/copy/auth";

export default function LoginPage() {
  return (
    <PageShell width="sm">
      <div className="flex flex-col items-center gap-6">
        <PageTitle className="text-center">{authCopy.login.title}</PageTitle>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </PageShell>
  );
}
