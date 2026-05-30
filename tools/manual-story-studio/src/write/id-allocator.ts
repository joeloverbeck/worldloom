import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecordClass,
} from "../schema/manual-story.js";

export function allocateNextId(
  manualStoryRoot: string,
  classDir: string,
  prefix: string,
): string {
  const targetDir = path.join(manualStoryRoot, "records", classDir);
  if (!existsSync(targetDir)) {
    return `${prefix}-1`;
  }
  // Strict regex: matches `<prefix>-<integer>.yaml` exactly. Widening this
  // pattern (e.g., to admit slug suffixes) is a deliberate single-point
  // change — discoverable via grep.
  const filenamePattern = new RegExp(`^${escapeRegex(prefix)}-(\\d+)\\.yaml$`);

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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
