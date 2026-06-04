export const authCopy = {
  signup: {
    title: "Create an account",
    emailLabel: "Email",
    passwordLabel: "Password",
    submit: "Sign up",
    submitting: "Signing up…",
    hasAccount: "Already have an account?",
    loginLink: "Log in",
  },
  login: {
    title: "Log in",
    emailLabel: "Email",
    passwordLabel: "Password",
    submit: "Log in",
    submitting: "Logging in…",
    noAccount: "Need an account?",
    signupLink: "Sign up",
    confirmEmailMessage:
      "Account created. Log in after confirming your email, or log in now if confirmation is disabled.",
  },
  onboarding: {
    title: "Set up your profile",
    description:
      "Choose topics you are comfortable discussing. You can opt in to respond to others.",
    topicsLabel: "Topics",
    topicsHint: "Select 1–5 topics.",
    optInLabel: "Opt in as a responder",
    optInHint: "Allow others to match with you as a responder.",
    submit: "Continue",
    submitting: "Saving…",
  },
  logout: {
    label: "Log out",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    invalidCredentials: "Invalid email or password.",
    profileSetup: "Could not set up your profile. Please try again.",
  },
} as const;
