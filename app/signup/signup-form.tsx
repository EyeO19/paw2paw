"use client";

import { useActionState } from "react";

import { signUp, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/app/components/ui/button";
import {
  FieldError,
  Input,
  Label,
} from "@/app/components/ui/input";
import { TextLink } from "@/app/components/ui/page-shell";
import { authCopy } from "@/lib/copy/auth";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex flex-col">
        <Label htmlFor="email">{authCopy.signup.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.error)}
        />
      </div>
      <div className="flex flex-col">
        <Label htmlFor="password">{authCopy.signup.passwordLabel}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={Boolean(state.error)}
        />
      </div>
      {state.error ? <FieldError>{state.error}</FieldError> : null}
      <Button type="submit" disabled={pending}>
        {pending ? authCopy.signup.submitting : authCopy.signup.submit}
      </Button>
      <p className="text-center text-sm text-ink-secondary">
        {authCopy.signup.hasAccount}{" "}
        <TextLink href="/login">{authCopy.signup.loginLink}</TextLink>
      </p>
    </form>
  );
}
