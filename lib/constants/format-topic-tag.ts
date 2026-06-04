/** Display label for a topic tag slug (not user-facing copy). */
export function formatTopicTagLabel(tag: string): string {
  return tag.replace(/-/g, " ");
}
