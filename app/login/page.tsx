import { Suspense } from "react";

import { LoginForm } from "@/app/login/login-form";
import { authCopy } from "@/lib/copy/auth";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {authCopy.login.title}
        </h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
