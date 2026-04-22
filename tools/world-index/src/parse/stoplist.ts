export const CAPITALIZED_MULTIWORD_STOPLIST = new Set<string>([
  "The Maker",
  "The Makers",
  "A Certain",
  "Once Upon"
]);

export function isStoplistedEntityCandidate(candidate: string): boolean {
  return CAPITALIZED_MULTIWORD_STOPLIST.has(candidate.trim());
}
