export const respondCopy = {
  home: {
    respondToSomeone: "Respond to someone",
  },
  respond: {
    title: "Open conversations",
    empty: "No conversations match your topics right now. Check back soon.",
    respondButton: "Respond to this",
    claiming: "Claiming…",
    createdLabel: "Created",
  },
  optIn: {
    title: "Opt in to respond",
    body: "Turn on responder mode in your profile to browse and claim conversations.",
    cta: "Update profile",
  },
  thread: {
    matchedTitle: "Conversation matched",
    matchedBody:
      "Realtime messaging coming in the next chunk. You are connected with another student.",
    threadIdLabel: "Thread",
    topicsLabel: "Topics",
    homeLink: "Back home",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    unauthenticated: "You must be logged in to respond.",
    threadUnavailable: "This conversation is no longer available.",
  },
} as const;
