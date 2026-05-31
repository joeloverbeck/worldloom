import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

const FORBIDDEN_WORLD_SUBDIRS = [
  "stories",
  "_source",
  "characters",
  "diegetic-artifacts",
  "_index",
];

const FORBIDDEN_TOOL_PREFIXES = [
  "tools/story-explorer/",
  "tools/patch-engine/",
  "tools/world-index/",
  "tools/world-mcp/",
];

export interface ManualStoryRoot {
  repoRoot: string;
  worldSlug: string;
  manualStorySlug: string;
  absolutePath: string;
}

export function resolveManualStoryRoot(
  repoRoot: string,
  worldSlug: string,
  manualStorySlug: string,
): ManualStoryRoot {
  if (!SLUG_PATTERN.test(worldSlug)) {
    throw new Error(`invalid world slug: ${worldSlug}`);
  }
  if (!SLUG_PATTERN.test(manualStorySlug)) {
    throw new Error(`invalid manual story slug: ${manualStorySlug}`);
  }

  const absolutePath = path.resolve(
    repoRoot,
    "worlds",
    worldSlug,
    "manual-stories",
    manualStorySlug,
  );
  return { repoRoot, worldSlug, manualStorySlug, absolutePath };
}

export function assertInsideSandbox(targetPath: string, root: ManualStoryRoot): void {
  const realTarget = resolveRealPath(targetPath);
  const realRoot = resolveRealPath(root.absolutePath);

  const relative = path.relative(realRoot, realTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`sandbox escape: ${realTarget} is not inside ${realRoot}`);
  }

  const realRepoRoot = resolveRealPath(root.repoRoot);
  const relativeToRepo = path.relative(realRepoRoot, realTarget);
  const segments = relativeToRepo.split(path.sep);

  if (segments[0] === "worlds" && segments.length >= 3) {
    const worldSubdir = segments[2] ?? "";
    if (FORBIDDEN_WORLD_SUBDIRS.includes(worldSubdir)) {
      throw new Error(
        `sandbox denylist hit: ${realTarget} falls under forbidden destination ${worldSubdir}`,
      );
    }
  }

  const posixRelativeToRepo = relativeToRepo.split(path.sep).join("/");
  for (const prefix of FORBIDDEN_TOOL_PREFIXES) {
    if (posixRelativeToRepo.startsWith(prefix)) {
      throw new Error(
        `sandbox denylist hit: ${realTarget} falls under forbidden tool prefix ${prefix}`,
      );
    }
  }
}

export function safeWriteFile(
  root: ManualStoryRoot,
  relativePath: string,
  contents: string,
): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`sandbox: relativePath must be relative: ${relativePath}`);
  }
  const target = path.join(root.absolutePath, relativePath);
  assertInsideSandbox(target, root);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
  return target;
}

export function safeUnlinkPath(root: ManualStoryRoot, absoluteTarget: string): void {
  // Defense-in-depth: the unlink target must resolve inside the manual-story
  // root via realpath, paralleling sandbox discipline for writes.
  assertInsideSandbox(absoluteTarget, root);
}

function resolveRealPath(targetPath: string): string {
  try {
    return realpathSync.native(targetPath);
  } catch {
    const parent = path.dirname(targetPath);
    const basename = path.basename(targetPath);
    try {
      return path.join(realpathSync.native(parent), basename);
    } catch {
      return path.resolve(targetPath);
    }
  }
}
