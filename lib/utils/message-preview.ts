const PREVIEW_MAX_LENGTH = 200;

type MessageRow = {
  content: string;
  created_at: string;
};

export function firstMessagePreview(messages: MessageRow[] | null): string {
  if (!messages || messages.length === 0) {
    return "";
  }

  const sorted = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const content = sorted[0]?.content ?? "";

  if (content.length <= PREVIEW_MAX_LENGTH) {
    return content;
  }

  return `${content.slice(0, PREVIEW_MAX_LENGTH)}…`;
}
