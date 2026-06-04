/** Normalize for phrase matching only — never log or persist. */
export function normalizeForCrisisMatch(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * High-specificity phrases aligned to crisis domains (ideation, intent, self-harm).
 * Word-boundary matching; no bare stems (kill, die, suicide alone).
 */
const CRISIS_PHRASE_PATTERNS: RegExp[] = [
  /\bwant to die\b/,
  /\bwish i (?:was|were) dead\b/,
  /\bdon'?t want to (?:be|stay) alive\b/,
  /\bbetter off dead\b/,
  /\bend my life\b/,
  /\bkill myself\b/,
  /\bhave a plan to (?:die|kill myself)\b/,
  /\bgoing to kill myself\b/,
  /\bgoing to end my life\b/,
  /\bhurt myself on purpose\b/,
  /\bcut myself\b/,
  /\boverdose on purpose\b/,
  /\bwant to be dead\b/,
  /\brather be dead\b/,
  /\bkms\b/,
];

export function detectCrisisSignals(text: string): boolean {
  const normalized = normalizeForCrisisMatch(text);
  if (!normalized) {
    return false;
  }
  return CRISIS_PHRASE_PATTERNS.some((pattern) => pattern.test(normalized));
}
