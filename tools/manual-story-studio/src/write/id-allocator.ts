import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecordClass,
} from "../schema/manual-story.js";

export interface AllocateNextIdOptions {
  // Filename extension to scan for. Default "yaml" to preserve the
  // existing record-class allocation behavior; PROMPT-n allocation passes
  // "md" so the scan considers PROMPT-N.md instead.
  extension?: string;
  // Allocator scans `<manualStoryRoot>/<scanDir>/<classDir>/<prefix>-N.<ext>`.
  // Default scanDir is "records" (record-class storage). PROMPT-n
  // allocation passes "" so the scan considers
  // <manualStoryRoot>/prompts/PROMPT-N.md directly.
  scanDirOverride?: string;
}

export function allocateNextId(
  manualStoryRoot: string,
  classDir: string,
  prefix: string,
  options: AllocateNextIdOptions = {},
): string {
  const extension = options.extension ?? "yaml";
  const scanDir = options.scanDirOverride ?? "records";
  const targetDir = scanDir.length > 0
    ? path.join(manualStoryRoot, scanDir, classDir)
    : path.join(manualStoryRoot, classDir);
  if (!existsSync(targetDir)) {
    return `${prefix}-1`;
  }
  // Strict regex: matches `<prefix>-<integer>.<extension>` exactly.
  // Widening this pattern (e.g., to admit slug suffixes) is a deliberate
  // single-point change — discoverable via grep.
  const filenamePattern = new RegExp(
    `^${escapeRegex(prefix)}-(\\d+)\\.${escapeRegex(extension)}$`,
  );

  const entries = readdirSync(targetDir, { withFileTypes: true });
  let max = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = filenamePattern.exec(entry.name);
    if (!match) continue;
    const n = Number.parseInt(match[1] ?? "0", 10);
    if (Number.isFinite(n) && n > max) {
      max = n;
    }
  }
  return `${prefix}-${max + 1}`;
}

export function allocateNextIdForClass(
  manualStoryRoot: string,
  recordClass: ManualRecordClass,
): string {
  const prefix = MANUAL_RECORD_CLASS_PREFIXES[recordClass];
  return allocateNextId(manualStoryRoot, recordClass, prefix);
}

// PROMPT-<n> allocation lives at <manualStoryRoot>/prompts/PROMPT-N.md
// (not under records/). Uppercase prefix is intentional and distinct from
// the lowercase m*-prefixed record classes per SPEC-102.
export function allocateNextPromptId(manualStoryRoot: string): string {
  return allocateNextId(manualStoryRoot, "prompts", "PROMPT", {
    extension: "md",
    scanDirOverride: "",
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
