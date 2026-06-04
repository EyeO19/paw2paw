import { SignupForm } from "@/app/signup/signup-form";
import { authCopy } from "@/lib/copy/auth";

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {authCopy.signup.title}
        </h1>
        <SignupForm />
      </div>
    </div>
  );
}
