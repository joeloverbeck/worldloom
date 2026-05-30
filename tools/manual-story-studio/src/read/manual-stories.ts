import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface ManualStoryEntry {
  worldSlug: string;
  manualStorySlug: string;
  absolutePath: string;
  title: string | null;
}

export function enumerateManualStories(
  repoRoot: string,
  worldSlug: string,
): ManualStoryEntry[] {
  if (!SLUG_PATTERN.test(worldSlug)) {
    throw new Error(`invalid world slug: ${worldSlug}`);
  }

  const manualStoriesDir = path.join(repoRoot, "worlds", worldSlug, "manual-stories");
  if (!existsSync(manualStoriesDir)) {
    return [];
  }

  const entries = readdirSync(manualStoriesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => SLUG_PATTERN.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en-US"));

  const results: ManualStoryEntry[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(manualStoriesDir, entry.name);
    const manualStoryYamlPath = path.join(absolutePath, "manual-story.yaml");
    if (!existsSync(manualStoryYamlPath)) {
      continue;
    }
    const title = readTitleFromManualStoryYaml(manualStoryYamlPath);
    results.push({
      worldSlug,
      manualStorySlug: entry.name,
      absolutePath,
      title,
    });
  }
  return results;
}

function readTitleFromManualStoryYaml(yamlPath: string): string | null {
  try {
    const contents = readFileSync(yamlPath, "utf8");
    const parsed = YAML.parse(contents) as unknown;
    if (parsed && typeof parsed === "object" && "title" in parsed) {
      const value = (parsed as Record<string, unknown>).title;
      if (typeof value === "string") {
        return value;
      }
    }
    return null;
  } catch {
    return null;
  }
}
