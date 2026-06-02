import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import type { CurrentContext } from "../schema/current-context.js";
import { err, ok, type ReadResult } from "./result.js";

const CURRENT_CONTEXT_FILENAME = "current-context.yaml";

export function readCurrentContext(manualStoryRoot: string): ReadResult<CurrentContext | null> {
  const fullPath = path.join(manualStoryRoot, CURRENT_CONTEXT_FILENAME);
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
      repair_hint: "Check file permissions on current-context.yaml.",
    });
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(text) as unknown;
  } catch (cause) {
    return err({
      code: "current-context-yaml-parse-failed",
      path: fullPath,
      cause,
      repair_hint: "Fix YAML syntax errors in current-context.yaml.",
    });
  }

  return ok(parsed as CurrentContext);
}
