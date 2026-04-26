import { readdirSync } from "node:fs";
import path from "node:path";

export interface FileEnumeration {
  indexable: string[];
  unexpected: string[];
}

export const MANDATORY_WORLD_FILES = new Set([
  "WORLD_KERNEL.md",
  "INVARIANTS.md",
  "ONTOLOGY.md",
  "TIMELINE.md",
  "GEOGRAPHY.md",
  "PEOPLES_AND_SPECIES.md",
  "INSTITUTIONS.md",
  "ECONOMY_AND_RESOURCES.md",
  "MAGIC_OR_TECH_SYSTEMS.md",
  "EVERYDAY_LIFE.md",
  "CANON_LEDGER.md",
  "OPEN_QUESTIONS.md",
  "MYSTERY_RESERVE.md"
]);

const PRIMARY_AUTHORED_ROOT_FILES = new Set(["WORLD_KERNEL.md", "ONTOLOGY.md"]);
const ATOMIC_SOURCE_DIRECTORIES = new Set([
  "canon",
  "change-log",
  "invariants",
  "mystery-reserve",
  "open-questions",
  "entities",
  "everyday-life",
  "institutions",
  "magic-or-tech-systems",
  "geography",
  "economy-and-resources",
  "peoples-and-species",
  "timeline"
]);

/**
 * Enumerates disk-backed world files that the indexer may process directly.
 * Generated logical rows such as atomized domain-file sentinels are not files
 * and remain outside this filesystem inventory.
 */
export function enumerate(worldRoot: string): FileEnumeration {
  const indexable: string[] = [];
  const unexpected: string[] = [];

  walk(worldRoot, "", indexable, unexpected);

  indexable.sort();
  unexpected.sort();

  return {
    indexable,
    unexpected
  };
}

function walk(
  worldRoot: string,
  relativeDirectory: string,
  indexable: string[],
  unexpected: string[]
): void {
  const directoryPath = path.join(worldRoot, relativeDirectory);
  const entries = readdirSync(directoryPath, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name, "en-US")
  );

  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? toPosixPath(path.join(relativeDirectory, entry.name))
      : entry.name;

    if (isExcludedPath(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(worldRoot, relativePath, indexable, unexpected);
      continue;
    }

    if (entry.isFile()) {
      if (isIndexablePath(relativePath)) {
        indexable.push(relativePath);
      } else {
        unexpected.push(relativePath);
      }
    }
  }
}

function isExcludedPath(relativePath: string): boolean {
  const segments = relativePath.split("/");
  const basename = segments[segments.length - 1] ?? "";

  if (segments[0] === "_index") {
    return true;
  }

  if (segments.some((segment) => segment.startsWith("."))) {
    return true;
  }

  if (basename === "INDEX.md") {
    return true;
  }

  if (segments.length === 2 && segments[0] === "audits" && basename.endsWith(".yaml")) {
    // Audit-sidecar YAML files are policy/baseline artifacts, not indexed source records.
    return true;
  }

  return false;
}

function isIndexablePath(relativePath: string): boolean {
  const segments = relativePath.split("/");
  const basename = segments[segments.length - 1] ?? "";

  if (
    segments.length === 3 &&
    segments[0] === "_source" &&
    basename.endsWith(".yaml")
  ) {
    const sourceDirectory = segments[1];
    return sourceDirectory ? ATOMIC_SOURCE_DIRECTORIES.has(sourceDirectory) : false;
  }

  if (!basename.endsWith(".md")) {
    return false;
  }

  if (segments.length === 1) {
    return PRIMARY_AUTHORED_ROOT_FILES.has(basename);
  }

  if (segments.length === 2) {
    const [directory] = segments;
    return (
      directory === "adjudications" ||
      directory === "characters" ||
      directory === "diegetic-artifacts" ||
      directory === "proposals" ||
      directory === "character-proposals" ||
      directory === "audits"
    );
  }

  if (
    segments.length === 3 &&
    ((segments[0] === "proposals" && segments[1] === "batches") ||
      (segments[0] === "character-proposals" && segments[1] === "batches"))
  ) {
    return true;
  }

  if (
    segments.length === 4 &&
    segments[0] === "audits" &&
    segments[2] === "retcon-proposals"
  ) {
    return true;
  }

  return false;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
