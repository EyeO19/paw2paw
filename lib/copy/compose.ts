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
    body: "Your message is waiting for a peer who shares your tags. Check your inbox — when someone responds, the conversation will appear here. Most threads get a reply within a few hours, but some take longer.",
    topicsLabel: "Topics for this conversation",
    inboxLink: "View my inbox",
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
