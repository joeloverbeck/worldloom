import { syncWorldIndex } from "./shared";
import type { IndexCommandOptions } from "./shared";

export function sync(worldRoot: string, worldSlug: string, options: IndexCommandOptions = {}): number {
  const result = syncWorldIndex(worldRoot, worldSlug, options);
  if (result.skippedRecordCount > 0 && result.skippedRecordLogPath) {
    process.stdout.write(
      `Skipped ${result.skippedRecordCount} records due to schema-pattern mismatch; see ${result.skippedRecordLogPath}\n`
    );
  }
  return result.exitCode;
}
