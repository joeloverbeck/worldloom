export const CAPITALIZED_MULTIWORD_STOPLIST = new Set<string>([
  "The Maker",
  "The Makers",
  "A Certain",
  "Once Upon",
  "Access Path",
  "Action Report",
  "Age Details",
  "Change Log Entry",
  "Continuity Archivist",
  "Core Pressures",
  "Genre Contract",
  "Mystery Curator",
  "Mystery Reserve",
  "Natural Story Engines",
  "No Silent Retcons",
  "Primary Difference",
  "Required Updates",
  "Tone Contract"
]);

export function isStoplistedEntityCandidate(candidate: string): boolean {
  return CAPITALIZED_MULTIWORD_STOPLIST.has(candidate.trim());
}
