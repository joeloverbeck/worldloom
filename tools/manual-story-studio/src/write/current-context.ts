import YAML from "yaml";

import { dropLegacyReviewKey } from "../read/current-context.js";
import type { CurrentContext } from "../schema/current-context.js";
import { safeWriteFile, type ManualStoryRoot } from "./sandbox.js";

export function writeCurrentContext(
  manualStoryRoot: ManualStoryRoot,
  ctx: CurrentContext,
): void {
  safeWriteFile(
    manualStoryRoot,
    "current-context.yaml",
    YAML.stringify(dropLegacyReviewKey(ctx)),
  );
}
