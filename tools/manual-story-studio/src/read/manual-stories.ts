import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { err, ok, type ReadResult } from "./result.js";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export interface ManualStoryEntry {
  worldSlug: string;
  manualStorySlug: string;
  absolutePath: string;
  title: string | null;
}

export function enumerateManualStories(repoRoot: string, worldSlug: string): ReadResult<ManualStoryEntry[]> {
  if (!SLUG_PATTERN.test(worldSlug)) {
    return err({
      code: "invalid_id_shape",
      path: path.join(repoRoot, "worlds", worldSlug, "manual-stories"),
      repair_hint: "World slug must contain only lowercase letters, numbers, and hyphens.",
    });
  }

  const manualStoriesDir = path.join(repoRoot, "worlds", worldSlug, "manual-stories");
  if (!existsSync(manualStoriesDir)) {
    return ok([]);
  }

  let entries;
  try {
    entries = readdirSync(manualStoriesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) => SLUG_PATTERN.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, "en-US"));
  } catch (cause) {
    return err({
      code: "io_error",
      path: manualStoriesDir,
      cause,
      repair_hint: "Check file permissions on the world's manual-stories directory.",
    });
  }

  const results: ManualStoryEntry[] = [];
  for (const entry of entries) {
    const absolutePath = path.join(manualStoriesDir, entry.name);
    const manualStoryYamlPath = path.join(absolutePath, "manual-story.yaml");
    if (!existsSync(manualStoryYamlPath)) {
      continue;
    }
    const title = readTitleFromManualStoryYaml(manualStoryYamlPath);
    if (!title.ok) return err(title.error);
    results.push({
      worldSlug,
      manualStorySlug: entry.name,
      absolutePath,
      title: title.value,
    });
  }
  return ok(results);
}

function readTitleFromManualStoryYaml(yamlPath: string): ReadResult<string | null> {
  let contents: string;
  try {
    contents = readFileSync(yamlPath, "utf8");
  } catch (cause) {
    return err({
      code: "io_error",
      path: yamlPath,
      cause,
      repair_hint: "Check file permissions on manual-story.yaml.",
    });
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(contents) as unknown;
  } catch (cause) {
    return err({
      code: "yaml_parse_failed",
      path: yamlPath,
      cause,
      repair_hint: "Fix YAML syntax errors in manual-story.yaml.",
    });
  }

  if (parsed && typeof parsed === "object" && "title" in parsed) {
    const value = (parsed as Record<string, unknown>).title;
    if (typeof value === "string") {
      return ok(value);
    }
  }
  return ok(null);
}
