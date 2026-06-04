import { normalizeForCrisisMatch } from "@/lib/constants/crisis-phrases";

export function hashCrisisText(text: string): string {
  const normalized = normalizeForCrisisMatch(text);
  let hash = 5381;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 33) ^ normalized.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

export function crisisAckStorageKey(
  surfaceId: string,
  text: string,
): string {
  return `crisis_ack_${surfaceId}_${hashCrisisText(text)}`;
}

export function hasCrisisAck(surfaceId: string, text: string): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(crisisAckStorageKey(surfaceId, text)) === "1";
}

export function markCrisisAck(surfaceId: string, text: string): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(crisisAckStorageKey(surfaceId, text), "1");
}
