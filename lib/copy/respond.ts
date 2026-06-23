export const respondCopy = {
  home: {
    respondToSomeone: "Respond to someone",
  },
  respond: {
    title: "Someone needs support",
    listIntro:
      "You can support one person at a time. These open conversations are waiting for a response.",
    empty: "No open conversations right now. Check back soon.",
    respondButton: "Start responding",
    claiming: "Starting…",
    createdLabel: "Created",
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
    activeEngagement:
      "You're already supporting someone. Finish that conversation before responding to another.",
  },
} as const;
