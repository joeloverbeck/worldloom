# SPEC100MANSTOSTU-003: Realpath filesystem write sandbox + denylist

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/write/sandbox.ts`. No impact on existing tools.
**Deps**: SPEC100MANSTOSTU-001

## Problem

SPEC-100 §2 in-scope item 3 requires a **filesystem-level write sandbox** that is the in-tool primary guard preventing Manual Studio writes from escaping into world canon, story bundles, or other tool packages. The route-level fence (ticket 002) prevents misregistration of write handlers; this sandbox prevents an *already-registered* write handler from being tricked (via symlink, `..` traversal, or absolute user-supplied path) into writing outside its allowed surface. Every write route accepts only logical IDs (world slug, manual story slug, record class, record id) — never a free-form path — and `assertInsideSandbox` resolves the target real path via `fs.realpathSync.native` and asserts it falls inside the manual story root before any write proceeds.

## Assumption Reassessment (2026-05-30)

1. Manual Studio's allowed write surface per SPEC-100 §2 item 3 is `worlds/<slug>/manual-stories/<manual-story-slug>/**` only. The forbidden destinations (denylist) per SPEC-100 §2 item 3 are: `worlds/<slug>/stories/`, `worlds/<slug>/_source/`, `worlds/<slug>/characters/`, `worlds/<slug>/diegetic-artifacts/`, `worlds/<slug>/_index/`, `tools/story-explorer/`, `tools/patch-engine/`, `tools/world-index/`, `tools/world-mcp/`. The list is applied to the **resolved real path** (post-symlink-resolution) — not to the input path — so a symlink pointing from `manual-stories/<slug>/escape` into `stories/<bundle>/_source/` is detected.
2. SPEC-100 §4 Files to touch line 71 specifies `tools/manual-story-studio/src/write/sandbox.ts` as the implementation path. The exposed API per the spec: `resolveManualStoryRoot(repoRoot, worldSlug, manualStorySlug)` returns the canonical `worlds/<slug>/manual-stories/<manual-story-slug>/` absolute path; `assertInsideSandbox(realPath, manualStoryRoot)` throws if the realpath escapes the sandbox or hits the denylist.
3. **Cross-skill / cross-artifact boundary**: this ticket establishes the filesystem-level write contract that ticket 007 (manual-stories routes) consumes from every POST handler. The shared boundary is the `(repoRoot, worldSlug, manualStorySlug) → manualStoryRoot → assertInsideSandbox(realPath, manualStoryRoot)` chain — each write route resolves the logical IDs, computes the target real path, asserts the sandbox, then writes. Sibling-pattern reference: `tools/story-explorer/` has no equivalent (read-only); the sandbox is a Manual Studio-specific primary guard with no upstream precedent in the worldloom codebase.

## Architecture Check

1. **Realpath-based, not lexical-path-based**: `path.normalize` + `..` rejection is insufficient — a symlink in the manual-story directory can point outside without any `..` in the input. `fs.realpathSync.native` follows symlinks and returns the canonical filesystem path; the subsequent `path.relative(manualStoryRoot, realPath)` check (no `..`, not absolute) is then trustworthy. This is the standard Unix-tool sandbox pattern.
2. **Denylist applied to resolved real path, not input**: applying the denylist to the resolved path catches every escape mechanism uniformly (symlink, `..`, absolute path the input was naively normalized from). Applying only to the input would be weaker.
3. **Logical IDs at the API boundary**: every write route accepts `(worldSlug, manualStorySlug, recordClass?, recordId?)` and never a free-form path. The sandbox's `resolveManualStoryRoot` + per-class path-builder helpers (e.g., `recordPath(root, recordClass, recordId)`) constrain the writeable surface at compile time. Free-form path arguments would invert the security posture and force every call site to remember to call the sandbox correctly.
4. No backwards-compatibility aliasing/shims introduced — this is a new module.

## Verification Layers

1. `..` traversal rejected → unit test that calls `assertInsideSandbox(realPath('/repo/worlds/W/manual-stories/S/../../escape'), manualStoryRoot)` and asserts it throws.
2. Symlink escape rejected → unit test that creates a symlink in a temp `manual-stories/S/` pointing to `/tmp/elsewhere/`, then `assertInsideSandbox(realPath(symlink), manualStoryRoot)` throws (real path of the symlink resolves outside the sandbox).
3. Absolute user-supplied path rejected → unit test that resolves an absolute path outside `manualStoryRoot` and asserts the assertion throws.
4. Denylist hit (resolved path under `worlds/<slug>/stories/`) → unit test that constructs a `manualStoryRoot` whose realpath is inside `stories/` (mocked) and asserts `assertInsideSandbox` throws with the denylist-violation reason.
5. Valid write target accepted → unit test that resolves a path inside the manual story root and asserts `assertInsideSandbox` returns without throwing.
6. Cross-artifact invariant — sandbox is the only filesystem-level write guard → codebase grep-proof: ticket 007's POST handlers all call `assertInsideSandbox` before any `fs.writeFileSync` / `fs.mkdirSync`.

## What to Change

### 1. Create `tools/manual-story-studio/src/write/sandbox.ts`

Exposed API:

```typescript
import { realpathSync } from "node:fs";
import path from "node:path";

const FORBIDDEN_DESTINATIONS = [
  "stories",                  // worlds/<slug>/stories/
  "_source",                  // worlds/<slug>/_source/
  "characters",               // worlds/<slug>/characters/
  "diegetic-artifacts",       // worlds/<slug>/diegetic-artifacts/
  "_index",                   // worlds/<slug>/_index/
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
  // Validate slugs (kebab-case, no .., no /)
  if (!/^[a-z0-9-]+$/.test(worldSlug)) throw new Error(`invalid world slug: ${worldSlug}`);
  if (!/^[a-z0-9-]+$/.test(manualStorySlug)) throw new Error(`invalid manual story slug: ${manualStorySlug}`);

  const absolutePath = path.resolve(repoRoot, "worlds", worldSlug, "manual-stories", manualStorySlug);
  return { repoRoot, worldSlug, manualStorySlug, absolutePath };
}

export function assertInsideSandbox(targetPath: string, root: ManualStoryRoot): void {
  // 1. If targetPath exists, resolve its real path. If it doesn't exist (creating a new file), resolve its parent and append basename.
  const realPath = resolveRealPath(targetPath);

  // 2. Reject if realPath is not under root.absolutePath
  const relative = path.relative(root.absolutePath, realPath);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`sandbox escape: ${realPath} is not inside ${root.absolutePath}`);
  }

  // 3. Denylist check on the resolved real path (defense-in-depth against malformed manualStoryRoot)
  const relativeToRepo = path.relative(root.repoRoot, realPath);
  const segments = relativeToRepo.split(path.sep);
  if (segments[0] === "worlds" && segments.length >= 3 && FORBIDDEN_DESTINATIONS.includes(segments[2] ?? "")) {
    throw new Error(`sandbox denylist hit: ${realPath} falls under forbidden destination ${segments[2]}`);
  }
  for (const prefix of FORBIDDEN_TOOL_PREFIXES) {
    if (relativeToRepo.startsWith(prefix)) {
      throw new Error(`sandbox denylist hit: ${realPath} falls under forbidden tool prefix ${prefix}`);
    }
  }
}

function resolveRealPath(targetPath: string): string {
  try {
    return realpathSync.native(targetPath);
  } catch {
    // Target doesn't exist yet (creating a new file); resolve the parent and append basename.
    const parent = path.dirname(targetPath);
    const basename = path.basename(targetPath);
    return path.join(realpathSync.native(parent), basename);
  }
}
```

### 2. Create test at `tools/manual-story-studio/test/write/sandbox.test.ts`

Use Node's `node:test` + `node:fs/promises` + `node:os` for temp-directory setup. Test cases:

1. **`..` traversal rejected**: assert `assertInsideSandbox('/tmp/worldloom-test/worlds/W/manual-stories/S/../../escape', root)` throws `/sandbox escape/`.
2. **Symlink escape rejected**: create temp dir with `manual-stories/S/link → /tmp/outside/`, then assert `assertInsideSandbox(linkPath, root)` throws `/sandbox escape/`.
3. **Absolute path outside root rejected**: assert `assertInsideSandbox('/tmp/elsewhere', root)` throws `/sandbox escape/`.
4. **Valid path inside root accepted**: assert `assertInsideSandbox('/tmp/worldloom-test/worlds/W/manual-stories/S/manual-story.yaml', root)` returns without throwing.
5. **Slug validation rejects malformed input**: assert `resolveManualStoryRoot('/r', 'World!', 'story')` throws `/invalid world slug/`; assert `resolveManualStoryRoot('/r', 'world', 'story with spaces')` throws `/invalid manual story slug/`.
6. **Denylist hit**: construct a `ManualStoryRoot` whose `absolutePath` is *under* a forbidden destination (e.g., manually crafted to point at `/repo/worlds/W/stories/`) — assert `assertInsideSandbox` throws `/sandbox denylist hit/`. (Defense-in-depth test even though `resolveManualStoryRoot` would not produce such a root.)

## Files to Touch

- `tools/manual-story-studio/src/write/sandbox.ts` (new)
- `tools/manual-story-studio/test/write/sandbox.test.ts` (new)

## Out of Scope

- Wiring the sandbox into POST handlers — ticket 007.
- The write-scope route guard — ticket 002 (orthogonal guard, route-level).
- Any modification to filesystem code outside `tools/manual-story-studio/` — Manual Studio's sandbox is the only filesystem-level write guard in this ticket; sibling tools (`tools/world-index/`, `tools/patch-engine/`) have their own write disciplines and are untouched here.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/write/sandbox.test.js"` — all 6 test cases pass.
2. `grep -E "sandbox escape|sandbox denylist hit" tools/manual-story-studio/src/write/sandbox.ts | wc -l` — error messages match the test regexes.

### Invariants

1. `assertInsideSandbox` resolves the target's real path (post-symlink, post-`..`) before checking containment. (Architectural invariant — lexical path checks are insufficient against symlink and `..` mechanisms.)
2. Every forbidden destination from SPEC-100 §2 item 3 appears in the denylist (`worlds/<slug>/stories/`, `_source/`, `characters/`, `diegetic-artifacts/`, `_index/`, `tools/story-explorer/`, `tools/patch-engine/`, `tools/world-index/`, `tools/world-mcp/`). (Data-contract invariant — the denylist mirrors the spec exactly.)

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/write/sandbox.test.ts` — new file, 6 test cases covering `..` / symlink / absolute path / valid / slug-validation / denylist scenarios.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/write/sandbox.test.js"` — targeted test run.
2. `cd tools/manual-story-studio && npm test` — full chain (after this ticket lands).
