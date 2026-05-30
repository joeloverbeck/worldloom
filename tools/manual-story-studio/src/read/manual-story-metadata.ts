import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import type { ManualStoryMetadata } from "../schema/manual-story.js";

export function readManualStoryMetadata(
  manualStoryRoot: string,
): ManualStoryMetadata | null {
  const fullPath = path.join(manualStoryRoot, "manual-story.yaml");
  if (!existsSync(fullPath)) return null;
  try {
    const text = readFileSync(fullPath, "utf8");
    const parsed = YAML.parse(text) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as ManualStoryMetadata;
  } catch {
    return null;
  }
}
