export const inboxCopy = {
  home: {
    currentConversations: "Current conversations",
  },
  inbox: {
    title: "Current conversations",
    empty: "You have no conversations yet. Share your first note or respond to someone.",
    sectionStarted: "Messages you started",
    sectionSupporting: "Conversations you're supporting",
    roleWriter: "You started this",
    roleResponder: "You're currently supporting someone",
    roleResponderClosed:
      "Thanks for supporting! Send a reminder in a couple days to see if they're okay.",
    statusPendingWriter: "Your current message",
    statusMatched: "Active",
    statusClosed: "Closed",
    updatedLabel: "Updated",
    homeLink: "Back home",
    newConversationLink: "Start a conversation",
  },
  errors: {
    loadFailed: "Could not load your conversations. Please try again.",
  },
} as const;
