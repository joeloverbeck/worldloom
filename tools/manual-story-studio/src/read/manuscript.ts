import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export interface ReadManuscriptOptions {
  manualStoryRoot: string;
}

export interface ManuscriptReadResult {
  manuscript_path: string;
  body: string;
  byte_count: number;
  word_count: number;
}

export function readManuscript(
  options: ReadManuscriptOptions,
): ManuscriptReadResult | null {
  const manuscript_path = path.join(options.manualStoryRoot, "manuscript.md");
  if (!existsSync(manuscript_path)) return null;

  try {
    const body = readFileSync(manuscript_path, "utf8");
    return {
      manuscript_path,
      body,
      byte_count: statSync(manuscript_path).size,
      word_count: countWords(body),
    };
  } catch {
    return null;
  }
}

function countWords(body: string): number {
  return body.trim().length === 0 ? 0 : body.trim().split(/\s+/u).length;
}
