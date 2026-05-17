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

export const ATOMIC_SOURCE_DEFAULT_THRESHOLD = 200;

export function thresholdForFile(fileName: string): number | null {
  return THRESHOLD_PROTECTED_FILES.get(fileName) ?? null;
}

export function isAtomicSourceYaml(relativePath: string): boolean {
  const normalized = relativePath.split(/[\\/]/).join("/");
  const isWorldAtomicSource = normalized.startsWith("_source/");
  const isStoryAtomicSource = /^stories\/[^/]+\/_source\//.test(normalized);

  if (!isWorldAtomicSource && !isStoryAtomicSource) {
    return false;
  }

  return normalized.endsWith(".yaml") || normalized.endsWith(".yml");
}
