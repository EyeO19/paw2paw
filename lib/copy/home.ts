import { MAX_WRITER_OPEN_THREADS } from "@/lib/constants/conversation-limits";

export const homeCopy = {
  tagline: "Anonymous peer support for Princeton students.",
  hubLabel: "Paw2Paw",
  respond: {
    title: "Respond to someone",
    finishTitle: "Finish responding",
    description: "Read one matched note and offer peer support.",
    finishDescription:
      "Return to the conversation you're supporting and finish your reply.",
  },
  compose: {
    title: "New conversation",
    description: "Share what is on your mind and wait for a peer.",
    descriptionWithCount(count: number) {
      return `${count}/${MAX_WRITER_OPEN_THREADS} conversations started. Share another note when you're ready.`;
    },
    limitReached(count: number) {
      return `${count}/${MAX_WRITER_OPEN_THREADS} conversations started. End one in Current conversations before starting another.`;
    },
  },
  inbox: {
    title: "Current conversations",
    description: "See active threads and notes waiting for a match.",
    descriptionAtLimit(count: number) {
      return `${count}/${MAX_WRITER_OPEN_THREADS} conversations started. End one before you can start another.`;
    },
  },
} as const;
