export const composeCopy = {
  compose: {
    title: "Start a conversation",
    topicsLabel: "Topics",
    topicsHint: "Choose 1–5 topics. Tags from your profile are listed first.",
    suggestedHint: "From your profile",
    contentLabel: "Your message",
    contentPlaceholder: "Write what you want to share…",
    submit: "Send",
    submitting: "Sending…",
  },
  pending: {
    title: "Message sent",
    body: "We'll find someone who gets it. We'll notify you when someone responds.",
    topicsLabel: "Topics for this conversation",
    homeLink: "Back home",
  },
  home: {
    newConversation: "New conversation",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    unauthenticated: "You must be logged in to start a conversation.",
  },
} as const;
