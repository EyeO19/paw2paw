"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { signIn, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/app/components/ui/button";
import {
  FieldError,
  InfoBanner,
  Input,
  Label,
} from "@/app/components/ui/input";
import { TextLink } from "@/app/components/ui/page-shell";
import { authCopy } from "@/lib/copy/auth";

const initialState: AuthActionState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const queryError = searchParams.get("error");
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const error = state.error ?? queryError ?? undefined;

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {message === "confirm-email" ? (
        <InfoBanner>{authCopy.login.confirmEmailMessage}</InfoBanner>
      ) : null}
      <div className="flex flex-col">
        <Label htmlFor="email">{authCopy.login.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(error)}
        />
      </div>
      <div className="flex flex-col">
        <Label htmlFor="password">{authCopy.login.passwordLabel}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(error)}
        />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      <Button type="submit" disabled={pending}>
        {pending ? authCopy.login.submitting : authCopy.login.submit}
      </Button>
      <p className="text-center text-sm text-ink-secondary">
        {authCopy.login.noAccount}{" "}
        <TextLink href="/signup">{authCopy.login.signupLink}</TextLink>
      </p>
    </form>
  );
}
