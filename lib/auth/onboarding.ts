export type UserProfileRow = {
  topic_tags: string[] | null;
};

export function needsOnboarding(profile: UserProfileRow | null): boolean {
  if (!profile) {
    return true;
  }
  const tags = profile.topic_tags ?? [];
  return tags.length === 0;
}
