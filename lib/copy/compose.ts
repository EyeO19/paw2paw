import { MAX_WRITER_OPEN_THREADS } from "@/lib/constants/conversation-limits";
import { reciprocityCopy } from "@/lib/copy/reciprocity";

export const composeCopy = {
  compose: {
    title: "Start a conversation",
    topicsLabel: "Topics",
    topicsHint: "Choose one or more topics. Tags from your profile are listed first.",
    suggestedHint: "From your profile",
    contentLabel: "Your message",
    contentPlaceholder: "Write what you want to share…",
    submit: "Send",
    submitting: "Sending…",
    homeLink: "Back home",
    writerLimit: `You already have ${MAX_WRITER_OPEN_THREADS} open conversations. End one in Current conversations before starting another.`,
  },
  pending: {
    title: "Message sent",
    body: "Your message is waiting for a peer who shares your tags. Check your inbox — when someone responds, the conversation will appear here. Most threads get a reply within a few hours, but some take longer.",
    topicsLabel: "Topics for this conversation",
    inboxLink: "View current conversations",
    homeLink: "Back home",
  },
  home: {
    newConversation: "New conversation",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    unauthenticated: "You must be logged in to start a conversation.",
    respondFirst: reciprocityCopy.gateBody,
    writerLimit: `You already have ${MAX_WRITER_OPEN_THREADS} open conversations. End one in Current conversations before starting another.`,
  },
} as const;
