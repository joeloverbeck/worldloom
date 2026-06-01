import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import type { ManualStoryMetadata } from "../schema/manual-story.js";
import { err, ok, type ReadResult } from "./result.js";

export function readManualStoryMetadata(manualStoryRoot: string): ReadResult<ManualStoryMetadata> {
  const fullPath = path.join(manualStoryRoot, "manual-story.yaml");
  if (!existsSync(fullPath)) {
    return err({
      code: "file_not_found",
      path: fullPath,
      repair_hint: "Create manual-story.yaml at the manual story root.",
    });
  }

  let text: string;
  try {
    text = readFileSync(fullPath, "utf8");
  } catch (cause) {
    return err({
      code: "io_error",
      path: fullPath,
      cause,
      repair_hint: "Check file permissions on manual-story.yaml.",
    });
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(text) as unknown;
  } catch (cause) {
    return err({
      code: "yaml_parse_failed",
      path: fullPath,
      cause,
      repair_hint: "Fix YAML syntax errors in manual-story.yaml.",
    });
  }

  if (typeof parsed !== "object" || parsed === null) {
    return err({
      code: "schema_validation_failed",
      path: fullPath,
      repair_hint: "manual-story.yaml must contain a top-level mapping.",
    });
  }

  return ok(parsed as ManualStoryMetadata);
}
