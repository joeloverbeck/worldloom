import { buildWorldIndex } from "./shared.js";
import type { IndexCommandOptions } from "./shared.js";

export function build(worldRoot: string, worldSlug: string, options: IndexCommandOptions = {}): number {
  const result = buildWorldIndex(worldRoot, worldSlug, options);
  if (result.skippedRecordCount > 0 && result.skippedRecordLogPath) {
    process.stdout.write(
      `Skipped ${result.skippedRecordCount} records due to schema-pattern mismatch; see ${result.skippedRecordLogPath}\n`
    );
  }
  return result.exitCode;
}
