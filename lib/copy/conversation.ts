export const conversationCopy = {
  resources: {
    summary: "Campus resources",
    intro: "Support outside this conversation:",
  },
  thread: {
    endConversation: "End conversation",
    ending: "Ending…",
    confirmEnd:
      "End this conversation? You'll still be able to read history but no new messages can be sent.",
    endedBanner:
      "This conversation has ended. History remains visible.",
    homeLink: "Back home",
  },
  composer: {
    label: "Message",
    placeholder: "Write a message…",
    send: "Send",
    sending: "Sending…",
  },
  message: {
    sending: "Sending…",
    failed: "Couldn't send",
    retry: "Retry",
    you: "You",
    other: "Them",
    report: "Report",
    reporting: "Reporting…",
    reported: "Reported",
  },
  report: {
    toastSuccess: "Thanks — we've noted this message for review.",
    toastError: "Couldn't submit a report. Try again.",
  },
  toast: {
    dismiss: "Dismiss",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    unauthenticated: "You must be logged in to continue.",
    sendFailed: "Couldn't send. Try again.",
    endFailed: "Couldn't end the conversation. Try again.",
  },
} as const;
