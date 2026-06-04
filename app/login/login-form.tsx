"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { signIn, type AuthActionState } from "@/app/actions/auth";
import { authCopy } from "@/lib/copy/auth";

const initialState: AuthActionState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const queryError = searchParams.get("error");
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const error = state.error ?? queryError ?? undefined;

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      {message === "confirm-email" ? (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          {authCopy.login.confirmEmailMessage}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-900">
          {authCopy.login.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(error)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-900">
          {authCopy.login.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(error)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? authCopy.login.submitting : authCopy.login.submit}
      </button>
      <p className="text-center text-sm text-zinc-600">
        {authCopy.login.noAccount}{" "}
        <Link href="/signup" className="font-medium text-zinc-900 underline">
          {authCopy.login.signupLink}
        </Link>
      </p>
    </form>
  );
}
