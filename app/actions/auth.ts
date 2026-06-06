"use server";

import { redirect } from "next/navigation";

import { ensureUserProfile } from "@/lib/auth/ensure-user-profile";
import { redirectAfterAuthenticatedSession } from "@/lib/auth/redirect-after-auth";
import { safeInternalPath } from "@/lib/auth/safe-internal-path";
import { authCopy } from "@/lib/copy/auth";
import { settingsCopy } from "@/lib/copy/settings";
import {
  onboardingSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
};

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? authCopy.errors.generic };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return { error: error.message };
  }

  const authUser = data.user;
  if (!authUser) {
    return { error: authCopy.errors.generic };
  }

  // Defensive insert: works when Confirm email is off (session present).
  // No-ops or fails silently when unconfirmed; signIn path will ensure profile.
  if (data.session) {
    const profileResult = await ensureUserProfile(supabase, authUser.id);
    if (!profileResult.ok) {
      return { error: authCopy.errors.profileSetup };
    }
  }

  if (data.session) {
    return redirectAfterAuthenticatedSession(supabase, authUser.id);
  }

  // Email confirmation enabled: no session yet — signIn will ensureUserProfile.
  redirect("/login?message=confirm-email");
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? authCopy.errors.generic };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? authCopy.errors.invalidCredentials
          : error.message,
    };
  }

  const authUser = data.user;
  if (!authUser) {
    return { error: authCopy.errors.generic };
  }

  return redirectAfterAuthenticatedSession(supabase, authUser.id);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeOnboarding(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const topicTags = formData.getAll("topicTags").map(String);
  const optInResponder = formData.get("optInResponder") === "on";

  const parsed = onboardingSchema.safeParse({ topicTags, optInResponder });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? authCopy.errors.generic };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profileResult = await ensureUserProfile(supabase, user.id);
  if (!profileResult.ok) {
    return { error: authCopy.errors.profileSetup };
  }

  const { error } = await supabase
    .from("users")
    .update({
      topic_tags: parsed.data.topicTags,
      opt_in_responder: parsed.data.optInResponder,
    })
    .eq("id", user.id);

  if (error) {
    return { error: authCopy.errors.generic };
  }

  redirect("/");
}

export async function updateProfile(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const topicTags = formData.getAll("topicTags").map(String);
  const optInResponder = formData.get("optInResponder") === "on";
  const returnTo = safeInternalPath(formData.get("from"));

  const parsed = onboardingSchema.safeParse({ topicTags, optInResponder });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? settingsCopy.errors.generic,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: before } = await supabase
    .from("users")
    .select("opt_in_responder")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("users")
    .update({
      topic_tags: parsed.data.topicTags,
      opt_in_responder: parsed.data.optInResponder,
    })
    .eq("id", user.id);

  if (error) {
    return { error: settingsCopy.errors.generic };
  }

  const wasOptedIn = Boolean(before?.opt_in_responder);
  const nowOptedIn = parsed.data.optInResponder;

  if (nowOptedIn && !wasOptedIn) {
    redirect("/respond");
  }

  redirect(returnTo);
}
