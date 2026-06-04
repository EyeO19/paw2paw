"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUp, type AuthActionState } from "@/app/actions/auth";
import { authCopy } from "@/lib/copy/auth";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-900">
          {authCopy.signup.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.error)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-900">
          {authCopy.signup.passwordLabel}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(state.error)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? authCopy.signup.submitting : authCopy.signup.submit}
      </button>
      <p className="text-center text-sm text-zinc-600">
        {authCopy.signup.hasAccount}{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          {authCopy.signup.loginLink}
        </Link>
      </p>
    </form>
  );
}
