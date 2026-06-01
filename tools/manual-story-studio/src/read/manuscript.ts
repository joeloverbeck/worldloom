import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { err, ok, type ReadResult } from "./result.js";

export interface ReadManuscriptOptions {
  manualStoryRoot: string;
}

export interface ManuscriptReadResult {
  manuscript_path: string;
  manuscript_present: boolean;
  body: string;
  byte_count: number;
  word_count: number;
}

export function readManuscript(
  options: ReadManuscriptOptions,
): ReadResult<ManuscriptReadResult> {
  const manuscript_path = path.join(options.manualStoryRoot, "manuscript.md");
  if (!existsSync(manuscript_path)) {
    return ok({
      manuscript_path,
      manuscript_present: false,
      body: "",
      byte_count: 0,
      word_count: 0,
    });
  }

  try {
    const body = readFileSync(manuscript_path, "utf8");
    return ok({
      manuscript_path,
      manuscript_present: true,
      body,
      byte_count: statSync(manuscript_path).size,
      word_count: countWords(body),
    });
  } catch (cause) {
    return err({
      code: "io_error",
      path: manuscript_path,
      cause,
      repair_hint: "Check file permissions on manuscript.md.",
    });
  }
}

function countWords(body: string): number {
  return body.trim().length === 0 ? 0 : body.trim().split(/\s+/u).length;
}
