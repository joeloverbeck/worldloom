import { allocateNextId } from "./id-allocator.js";

export function allocateNextSegmentId(manualStoryRoot: string): string {
  return allocateNextId(manualStoryRoot, "segments", "SEG", {
    extension: "yaml",
    scanDirOverride: "",
  });
}
