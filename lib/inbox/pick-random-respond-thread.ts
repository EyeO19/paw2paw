import type { RespondThreadWithMessages } from "@/lib/inbox/load-respond-threads";

export function pickRandomRespondThread(
  threads: RespondThreadWithMessages[],
): RespondThreadWithMessages | null {
  if (threads.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * threads.length);
  return threads[index] ?? null;
}
