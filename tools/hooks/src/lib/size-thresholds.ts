export const ALWAYS_PROTECTED_FILES = new Set([
  "CANON_LEDGER.md"
]);

export const THRESHOLD_PROTECTED_FILES = new Map<string, number>([
  ["MYSTERY_RESERVE.md", 300],
  ["EVERYDAY_LIFE.md", 300],
  ["INSTITUTIONS.md", 300],
  ["OPEN_QUESTIONS.md", 300],
  ["TIMELINE.md", 300],
  ["GEOGRAPHY.md", 300]
]);

export const ALWAYS_ALLOWED_DIRECTORIES = [
  "characters",
  "diegetic-artifacts",
  "proposals",
  "adjudications",
  "audits",
  "character-proposals",
  "briefs"
];

export function thresholdForFile(fileName: string): number | null {
  return THRESHOLD_PROTECTED_FILES.get(fileName) ?? null;
}
