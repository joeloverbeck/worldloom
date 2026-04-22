export const CAPITALIZED_MULTIWORD_STOPLIST = new Set<string>([
  "The Maker",
  "The Makers",
  "A Certain",
  "Once Upon",
  "Access Path",
  "Action Report",
  "Age Details",
  "Breakage Points",
  "Canon Safety Check Trace",
  "Change Log Entry",
  "Continuity Archivist",
  "Core Pressures",
  "Distribution Discipline",
  "Genre Contract",
  "Mystery Curator",
  "Mystery Reserve",
  "Natural Story Engines",
  "No Silent Retcons",
  "Primary Difference",
  "Primary Rule",
  "Regional Asymmetry",
  "Required Updates",
  "Repairs Applied",
  "Tone Contract",
  "Truth Check",
  "Value Stores",
  "World Laundering"
]);

export function isStoplistedEntityCandidate(candidate: string): boolean {
  return CAPITALIZED_MULTIWORD_STOPLIST.has(candidate.trim());
}
