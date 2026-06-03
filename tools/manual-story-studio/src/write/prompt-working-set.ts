import YAML from "yaml";

import { dropLegacyReviewKey } from "../read/prompt-working-set.js";
import type { PromptWorkingSet } from "../schema/prompt-working-set.js";
import { safeWriteFile, type ManualStoryRoot } from "./sandbox.js";

export function writePromptWorkingSet(
  manualStoryRoot: ManualStoryRoot,
  ctx: PromptWorkingSet,
): void {
  safeWriteFile(
    manualStoryRoot,
    "prompt-working-set.yaml",
    YAML.stringify(dropLegacyReviewKey(ctx)),
  );
}
