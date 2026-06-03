import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import type { PromptWorkingSet } from "../schema/prompt-working-set.js";
import { err, ok, type ReadResult } from "./result.js";

const PROMPT_WORKING_SET_FILENAME = "prompt-working-set.yaml";
const LEGACY_REVIEW_KEY = ["last", "reviewed", "after", "segment"].join("_");

export function readPromptWorkingSet(manualStoryRoot: string): ReadResult<PromptWorkingSet | null> {
  const fullPath = path.join(manualStoryRoot, PROMPT_WORKING_SET_FILENAME);
  if (!existsSync(fullPath)) {
    return ok(null);
  }

  let text: string;
  try {
    text = readFileSync(fullPath, "utf8");
  } catch (cause) {
    return err({
      code: "io_error",
      path: fullPath,
      cause,
      repair_hint: "Check file permissions on prompt-working-set.yaml.",
    });
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(text) as unknown;
  } catch (cause) {
    return err({
      code: "prompt-working-set-yaml-parse-failed",
      path: fullPath,
      cause,
      repair_hint: "Fix YAML syntax errors in prompt-working-set.yaml.",
    });
  }

  return ok(dropLegacyReviewKey(parsed) as PromptWorkingSet);
}

export function dropLegacyReviewKey<T>(value: T): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const copy = { ...(value as Record<string, unknown>) };
  delete copy[LEGACY_REVIEW_KEY];
  return copy as T;
}
