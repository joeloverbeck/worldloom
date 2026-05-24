export const SLT_GROUNDING_BANNED_PHRASES: readonly string[] = Object.freeze([
  "dramatic variety",
  "good conflict",
  "advance the plot",
  "raise stakes",
  "create tension",
  "for pacing",
  "dramatic moment",
  "story beat",
  "narrative momentum"
]);

export function reasonContainsBannedPhrase(reason: string): string | null {
  const haystack = reason.toLowerCase();
  for (const phrase of SLT_GROUNDING_BANNED_PHRASES) {
    if (haystack.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}
